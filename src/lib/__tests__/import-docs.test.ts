// Run: node --test src/lib/__tests__/import-docs.test.ts   (fake deps, no real filesystem, no git)
//
// Exercises `runImport`'s trust-boundary behaviour directly — the thing a "catch each source's
// error and keep going" importer cannot pass, however its own tests are written: on ANY discovery,
// manifest, read, frontmatter, git or nesting failure, write NOTHING and name every failure; on
// full success, write exactly one file per published source. Also exercises discovery's skip
// rules (`.docsignore`, `node_modules`, dot-directories), the path-traversal sink, the
// merge-collision rule, the closed section list, `summary`, link rewriting and the generated
// HTTP-API page — all of it wired in `runImport`, over a fake checkout. The pure rules live in
// `doc-sources.test.ts`, `link-rewrite.test.ts` and `api-reference.test.ts`; sub-page parentage, sub-page parentage, provenance stamping, `shared: false`
// drafts, and the uncommitted-changes refusal — these need real `runImport` + a fake checkout,
// unlike `doc-sources.test.ts`'s pure-function-level equivalents.

import assert from "node:assert/strict";
import { posix } from "node:path";
import { test } from "node:test";

import { runImport } from "../import-docs.ts";
import type { DirEntry, ImportDeps, ImportOptions } from "../import-docs.ts";
import { outputPath, renderDocFile } from "../doc-sources.ts";
import type { DocSource } from "../doc-sources.ts";

const ROOT = "/src";
const DATE = "2026-01-01T00:00:00Z";
const BODY = "fixture body\n";

interface World {
  /** Root-relative path → file text. Directories are implied by the paths. */
  files: Record<string, string>;
  /** Root-relative directories that are git repo toplevels; a file belongs to the deepest one
   *  enclosing it. Defaults to every first-level directory under the root. */
  repos?: string[];
  /** Repo dir → remote name → URL. Default: `upstream` = `https://github.com/w6w-io/w6w-<dir>.git`. */
  remotes?: Record<string, Record<string, string>>;
  /** Root-relative files with uncommitted changes. */
  dirty?: string[];
  /** Root-relative files never committed (`gitLastCommitDate` answers `null`). */
  uncommitted?: string[];
}

/** A fake checkout: a `Map` stands in for the filesystem, a few lookups for git, and the
 *  collection is a second `Map`. Any dep can be overridden per test to change or fail on demand. */
function fakeDeps(world: World, overrides: Partial<ImportDeps> = {}) {
  const writes = new Map<string, string>();
  const removed: string[] = [];
  const reads: string[] = [];
  const rel = (abs: string) => posix.relative(ROOT, abs);
  const repoDirs = world.repos ??
    [...new Set(Object.keys(world.files).map((f) => f.split("/")[0]))];
  const repoOf = (relPath: string) =>
    repoDirs.filter((r) => relPath === r || relPath.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0];

  const deps: ImportDeps = {
    readDir: async (dir) => {
      const prefix = rel(dir) === "" ? "" : `${rel(dir)}/`;
      const seen = new Map<string, DirEntry["kind"]>();
      for (const file of Object.keys(world.files)) {
        if (!file.startsWith(prefix)) continue;
        const rest = file.slice(prefix.length).split("/");
        seen.set(rest[0], rest.length === 1 ? "file" : "dir");
      }
      if (seen.size === 0 && prefix !== "") throw new Error(`ENOENT ${dir}`);
      return [...seen].map(([name, kind]) => ({ name, kind }));
    },
    readText: async (file) => {
      reads.push(rel(file));
      const text = world.files[rel(file)];
      if (text === undefined) throw new Error(`ENOENT: ${file}`);
      return text;
    },
    gitToplevel: async (dir) => {
      const repo = repoOf(rel(dir));
      if (repo === undefined) throw new Error(`not a git repository: ${dir}`);
      return posix.join(ROOT, repo);
    },
    gitRemoteUrl: async (repoRoot, remote) => {
      const dir = rel(repoRoot);
      const remotes = world.remotes?.[dir] ?? { upstream: `https://github.com/w6w-io/w6w-${dir}.git` };
      return remotes[remote] ?? null;
    },
    gitHeadSha: async (repoRoot) => `head-${rel(repoRoot)}`,
    gitBlobSha: async (file) => `blob-${rel(file)}`,
    gitLastCommitDate: async (repoRoot, path) => {
      if (path === ".") return "2025-12-31T00:00:00Z";
      return world.uncommitted?.includes(posix.join(rel(repoRoot), path)) ? null : DATE;
    },
    gitIsDirty: async (repoRoot, path) =>
      world.dirty?.includes(posix.join(rel(repoRoot), path)) ?? false,
    readExisting: async () => null,
    writeFile: async (path, bytes) => {
      writes.set(path, bytes);
    },
    // The collection root starts empty in most tests, so pruning is a no-op; the prune
    // behaviour itself is pinned by its own tests below with a seeded orphan.
    listExisting: async () => [],
    removeFile: async (path) => {
      removed.push(path);
    },
    ...overrides,
  };
  return { deps, writes, removed, reads };
}

const OPTIONS: ImportOptions = { root: ROOT };

/** The core repo's manifest for `sources` (all under `core/`, all root-resolved: they are plain
 *  RFC-style files with no frontmatter) and the files it lists. */
function rootFiles(sources: DocSource[]): Record<string, string> {
  const docs = sources.map((s) => ({
    path: `../${s.file.slice("core/".length)}`,
    slug: s.slug,
    section: s.section,
    title: s.title,
  }));
  return {
    "core/docs/manifest.json": JSON.stringify({ roots: ["rfcs"], docs }),
    ...Object.fromEntries(sources.map((s) => [s.file, BODY])),
  };
}

function page(fields: Record<string, unknown>, body = "# Page\n"): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return ["---", ...lines, "---", "", body].join("\n");
}

function manifest(docs: unknown[]): string {
  return JSON.stringify({ docs });
}

const STUDIO_MANIFEST = manifest([
  { path: "overview.md", slug: "overview", section: "guides", title: "Overview", order: 0 },
  { path: "workflows/index.md", slug: "workflows", section: "guides", title: "Workflows", order: 40 },
  { path: "workflows/triggers.md", slug: "workflows/triggers", section: "guides", title: "Triggers", order: 10 },
]);

function studioFiles(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "studio/docs/manifest.json": STUDIO_MANIFEST,
    "studio/docs/overview.md": page({ key: "overview", title: "Overview", section: "guides", shared: true }),
    "studio/docs/workflows/index.md": page({ key: "workflows", title: "Workflows", section: "guides" }),
    "studio/docs/workflows/triggers.md": page({ key: "workflows/triggers", title: "Triggers", section: "guides" }),
    ...overrides,
  };
}

function fixtureSources(n: number): DocSource[] {
  return Array.from({ length: n }, (_, i) => ({
    file: `core/rfcs/f${i}.md`,
    section: "reference-spec",
    slug: `f${i}`,
    title: `F${i}`,
    order: null,
    position: i,
    summary: null,
    origin: "root" as const,
  }));
}

// --- Gather-then-write ------------------------------------------------------------------------

test("all sources succeed -> exit 0, one file written per source, with stamped provenance", async () => {
  const sources = fixtureSources(5);
  const { deps, writes } = fakeDeps({ files: rootFiles(sources) });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(writes.size, 5);
  assert.equal(result.written.length, 5);
  const readme = sources[0]; // core/rfcs/f0.md
  assert.equal(
    writes.get(outputPath(readme)),
    renderDocFile(
      readme,
      { description: "", format: "markdown", shared: true },
      {
        sourceRepo: "w6w-io/w6w-core",
        sourcePath: "rfcs/f0.md",
        sourceSha: "blob-core/rfcs/f0.md",
        sourceRefSha: "head-core",
        syncedAt: DATE,
      },
      BODY,
    ),
  );
});

test("one missing source file -> non-zero exit, NOTHING written, the failing file named", async () => {
  const sources = fixtureSources(5);
  const files = rootFiles(sources);
  delete files[sources[2].file];
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0, "must write nothing when any source fails");
  assert.equal(result.written.length, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].at, sources[2].file);
  assert.match(result.failures[0].error, /ENOENT/);
});

test("one failing git lookup -> same hard-fail, even though the file read succeeded", async () => {
  const sources = fixtureSources(4);
  const target = sources[0];
  const { deps, writes } = fakeDeps({ files: rootFiles(sources) }, {
    gitBlobSha: async (file) => {
      if (file === posix.join(ROOT, target.file)) throw new Error("git hash-object failed");
      return "blob";
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.ok(result.failures.some((f) => f.at === target.file && /hash-object/.test(f.error)));
});

test("every source failing -> all of them are named, still nothing written", async () => {
  const files = rootFiles(fixtureSources(3));
  for (const source of fixtureSources(3)) delete files[source.file];
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.equal(result.failures.length, 3);
});

test("writeFile is never called before every source has been gathered (not interleaved)", async () => {
  const sources = fixtureSources(4);
  const files = rootFiles(sources);
  delete files[sources[3].file]; // fails last, so an interleaved implementation would have written 3
  const calls: string[] = [];
  const { deps } = fakeDeps({ files }, {
    writeFile: async (path) => {
      calls.push(`write:${path}`);
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(calls, []);
});

test("a source whose rendered bytes match what's already committed is unchanged; a changed sibling is written", async () => {
  const sources = fixtureSources(2);
  const first = fakeDeps({ files: rootFiles(sources) });
  await runImport(first.deps, OPTIONS);
  const committed = new Map(first.writes);
  committed.set(outputPath(sources[0]), "OLD bytes");

  const { deps, writes } = fakeDeps({ files: rootFiles(sources) }, {
    readExisting: async (path) => committed.get(path) ?? null,
  });
  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.written, [outputPath(sources[0])]);
  assert.deepEqual(result.unchanged, [outputPath(sources[1])]);
  assert.equal(writes.size, 1);
});

test("21 sources: full success writes exactly 21 files; one missing file writes zero of them", async () => {
  const sources = fixtureSources(21);
  const ok = fakeDeps({ files: rootFiles(sources) });
  const good = await runImport(ok.deps, OPTIONS);
  assert.equal(good.exitCode, 0, JSON.stringify(good.failures));
  assert.equal(ok.writes.size, 21);

  const files = rootFiles(sources);
  delete files[sources[5].file];
  const bad = fakeDeps({ files });
  const result = await runImport(bad.deps, OPTIONS);
  assert.notEqual(result.exitCode, 0);
  assert.equal(bad.writes.size, 0);
  assert.ok(result.failures.some((f) => f.at === sources[5].file));
});

// --- Prune and dry run ------------------------------------------------------------------------

test("prune: files the effective list no longer claims are removed — nested ones too — and claimed files are not", async () => {
  const sources = fixtureSources(3);
  const claimed = sources.map(outputPath);
  const orphans = ["rfcs/moved-away.md", "guides/workflows/old.md"];
  const { deps, removed } = fakeDeps({ files: rootFiles(sources) }, {
    listExisting: async () => [...claimed, ...orphans],
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0);
  // A section rename used to leave the old file behind, so the same document resolved at two
  // routes with nothing saying which was current.
  assert.deepEqual(result.removed, orphans);
  assert.deepEqual(removed, orphans);
});

test("prune never runs on the failure path — a failed read removes nothing", async () => {
  const files = rootFiles(fixtureSources(2));
  delete files["core/rfcs/f1.md"];
  const { deps, removed } = fakeDeps({ files }, {
    listExisting: async () => ["rfcs/stale.md"],
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(removed, []);
});

test("--dry-run reports what would be written and pruned, and writes and removes nothing", async () => {
  const sources = fixtureSources(3);
  const { deps, writes, removed } = fakeDeps({ files: { ...rootFiles(sources), ...studioFiles() } }, {
    listExisting: async () => ["packages/apps.md"],
  });

  const result = await runImport(deps, { root: ROOT, dryRun: true });

  assert.equal(result.exitCode, 0);
  assert.equal(result.dryRun, true);
  assert.equal(result.written.length, 6);
  assert.deepEqual(result.removed, ["packages/apps.md"]);
  assert.equal(writes.size, 0);
  assert.deepEqual(removed, []);
});

// --- Discovery --------------------------------------------------------------------------------

test("discovery finds every docs/manifest.json, nested ones included, in a stable order", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      ...studioFiles(),
      "wrappers/node/docs/manifest.json": manifest([
        { path: "node.md", slug: "node", section: "clients", title: "Node SDK" },
      ]),
      "wrappers/node/docs/node.md": page({ title: "Node SDK", section: "clients" }),
      "core/docs/manifest.json": manifest([]),
    },
    repos: ["core", "studio", "wrappers"],
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.manifests, [
    "core/docs/manifest.json",
    "studio/docs/manifest.json",
    "wrappers/node/docs/manifest.json",
  ]);
  assert.ok(writes.has("clients/node.md"));
});

test("discovery skips node_modules, dist, build and dot-directories — their manifests are never read", async () => {
  const poison = manifest([{ path: "x.md", slug: "x", section: "guides", title: "X" }]);
  const { deps, reads } = fakeDeps({
    files: {
      ...studioFiles(),
      "studio/node_modules/pkg/docs/manifest.json": poison,
      "studio/dist/docs/manifest.json": poison,
      "studio/build/docs/manifest.json": poison,
      "studio/.worktrees/lane/docs/manifest.json": poison,
      ".hidden/docs/manifest.json": poison,
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.manifests, ["studio/docs/manifest.json"]);
  assert.ok(reads.every((r) => r.startsWith("studio/docs/")), JSON.stringify(reads));
});

test("a .docsignore prunes its directory and everything under it, and is reported", async () => {
  const poison = manifest([{ path: "x.md", slug: "x", section: "guides", title: "X" }]);
  const { deps, reads } = fakeDeps({
    files: {
      ...studioFiles(),
      "apps/.docsignore": "integration pack — app READMEs are not docs pages\n",
      "apps/docs/manifest.json": poison,
      "apps/pack/slack/docs/manifest.json": poison,
      "studio/internal/.docsignore": "",
      "studio/internal/docs/manifest.json": poison,
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.ignored, ["apps", "studio/internal"]);
  assert.deepEqual(result.manifests, ["studio/docs/manifest.json"]);
  assert.ok(!reads.some((r) => r.startsWith("apps/") || r.startsWith("studio/internal/")));
});

test("a .docsignore at the source root ignores everything", async () => {
  const { deps } = fakeDeps({ files: { ...studioFiles(), ".docsignore": "" } });

  const result = await runImport(deps, OPTIONS);

  assert.deepEqual(result.ignored, ["."]);
  assert.deepEqual(result.manifests, []);
});

test("a directory that can't be listed fails the run instead of shrinking the catalog", async () => {
  const world = fakeDeps({ files: studioFiles() });
  const { deps, writes } = fakeDeps({ files: studioFiles() }, {
    readDir: async (dir) => {
      if (dir === "/src/studio") throw new Error("EACCES");
      return world.deps.readDir(dir);
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.equal(result.failures[0].at, "studio");
});

// --- Manifest validation ------------------------------------------------------------------------

test("a manifest entry missing 'slug' fails the run, naming the manifest and entry index", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      ...rootFiles(fixtureSources(2)),
      "ui/docs/manifest.json": manifest([{ path: "a.md", section: "guides", title: "A" }]),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  const failure = result.failures.find((f) => f.at === "ui/docs/manifest.json");
  assert.ok(failure, JSON.stringify(result.failures));
  assert.match(failure!.error, /entry 0/);
});

test("an unparseable manifest is a failure, not an empty result", async () => {
  const { deps } = fakeDeps({ files: { ...studioFiles(), "core/docs/manifest.json": "{nope" } });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.ok(result.failures.some((f) => f.at === "core/docs/manifest.json" && /JSON/.test(f.error)));
});

test("an out-of-range manifest slug (Foo, a/b/c, .., index) fails the run", async () => {
  for (const bad of ["Foo", "a/b/c", "..", "index"]) {
    const { deps, writes } = fakeDeps({
      files: {
        "ui/docs/manifest.json": manifest([{ path: "x.md", slug: bad, section: "guides", title: "X" }]),
        "ui/docs/x.md": page({ title: "X", section: "guides" }),
      },
    });

    const result = await runImport(deps, OPTIONS);

    assert.notEqual(result.exitCode, 0, `slug ${JSON.stringify(bad)} must fail the run`);
    assert.equal(writes.size, 0);
  }
});

// --- The sink: canonicalize once, never blocklist spellings ---------------------------------

test("traversal paths (subfolder spellings included) never read outside that docs/, and fail the run — while a legitimate sibling is still read", async () => {
  const fixtures = [
    "../../../README.md",
    "../README.md",
    "workflows/../../README.md",
    "workflows/../../../core/README.md",
    "/etc/passwd",
    "docs/../secret.md",
    "%2e%2e%2fsecret.md",
  ];

  for (const badPath of fixtures) {
    const { deps, reads, writes } = fakeDeps({
      files: {
        "studio/docs/manifest.json": manifest([
          { path: badPath, slug: "evil", section: "guides", title: "Evil" },
          { path: "workflows/triggers.md", slug: "triggers", section: "guides", title: "Triggers" },
        ]),
        "studio/docs/workflows/triggers.md": page({ title: "Triggers", section: "guides" }),
        // Real, out-of-scope content a raw (uncanonicalized) path would happily import.
        "studio/README.md": "ATTACKER CONTROLLED CONTENT\n",
        "core/README.md": "ATTACKER CONTROLLED CONTENT\n",
        "studio/secret.md": "ATTACKER CONTROLLED CONTENT\n",
      },
    });

    const result = await runImport(deps, OPTIONS);

    assert.notEqual(result.exitCode, 0, `badPath ${JSON.stringify(badPath)} must fail the run`);
    assert.equal(writes.size, 0);
    assert.ok(
      reads.every((p) => p.startsWith("studio/docs/")),
      `every read must stay under studio/docs/ — got: ${JSON.stringify(reads)}`,
    );
    assert.ok(
      reads.includes("studio/docs/workflows/triggers.md"),
      "the legitimate sibling entry must still be read — a wholesale manifest refusal would never reach it",
    );
  }
});

// --- Merge ----------------------------------------------------------------------------------

test("a manifest listing the SAME (section, slug) from the SAME file twice dedups — the later entry wins", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "core/docs/manifest.json": manifest([
        { path: "build-a-w6w-app.md", slug: "build-a-w6w-app", section: "guides", title: "Build a w6w app", order: 3 },
        { path: "build-a-w6w-app.md", slug: "build-a-w6w-app", section: "guides", title: "Build a w6w app", order: 7 },
      ]),
      "core/docs/build-a-w6w-app.md": page({ title: "Build a w6w app", section: "guides" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.equal(writes.size, 1, "one write, not two, for the deduplicated (section, slug)");
  assert.match(writes.get("guides/build-a-w6w-app.md")!, /\norder: 7\n/);
});

test("two manifests claiming one (section, slug) from DIFFERENT files fail the run, naming both", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "ui/docs/manifest.json": manifest([{ path: "a.md", slug: "ui", section: "reference-packages", title: "UI" }]),
      "ui/docs/a.md": page({ title: "UI", section: "reference-packages" }),
      "core/docs/manifest.json": manifest([{ path: "b.md", slug: "ui", section: "reference-packages", title: "UI" }]),
      "core/docs/b.md": page({ title: "UI", section: "reference-packages" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  const failure = result.failures.find((f) => /reference-packages, ui/.test(f.error));
  assert.ok(failure, JSON.stringify(result.failures));
  assert.match(failure!.error, /core\/docs\/b\.md/);
  assert.match(failure!.error, /ui\/docs\/a\.md/);
});

// --- Sub-pages ---------------------------------------------------------------------------------

test("a sub-page with its parent present lands at <section>/<parent>/<child>.md, carrying its order", async () => {
  const { deps, writes } = fakeDeps({ files: studioFiles() });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual([...writes.keys()].sort(), [
    "guides/overview.md",
    "guides/workflows.md",
    "guides/workflows/triggers.md",
  ]);
  const child = writes.get("guides/workflows/triggers.md")!;
  assert.match(child, /\nkey: "workflows\/triggers"\n/);
  assert.match(child, /\norder: 10\n/);
  assert.match(child, /\nposition: 2\n/);
});

test("a sub-page whose parent is missing fails the run", async () => {
  const files = studioFiles({
    "studio/docs/manifest.json": manifest([
      { path: "workflows/triggers.md", slug: "workflows/triggers", section: "guides", title: "Triggers" },
    ]),
  });
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.match(result.failures[0].error, /no published parent \(guides, workflows\)/);
});

test("a sub-page whose parent lives in a DIFFERENT section fails the run", async () => {
  const files = studioFiles({
    "studio/docs/manifest.json": manifest([
      { path: "workflows/index.md", slug: "workflows", section: "clients", title: "Workflows" },
      { path: "workflows/triggers.md", slug: "workflows/triggers", section: "guides", title: "Triggers" },
    ]),
    "studio/docs/workflows/index.md": page({ title: "Workflows", section: "clients" }),
  });
  const { deps } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(result.failures[0].at, "studio/docs/workflows/triggers.md");
});

test("a sub-page whose parent is a shared: false draft fails the run — no heading that links nowhere", async () => {
  const files = studioFiles({
    "studio/docs/workflows/index.md": page({ title: "Workflows", section: "guides", shared: false }),
  });
  const { deps } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.ok(result.failures.some((f) => f.at === "studio/docs/workflows/triggers.md"));
});

// --- Provenance ---------------------------------------------------------------------------------

test("provenance: repo from the enclosing repo's upstream remote, path repo-relative, url at HEAD", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "wrappers/node/docs/manifest.json": manifest([
        { path: "guide/start.md", slug: "start", section: "clients", title: "Start" },
      ]),
      "wrappers/node/docs/guide/start.md": page({ title: "Start", section: "clients", description: "Get going." }),
    },
    remotes: {
      wrappers: { origin: "git@github.com:segevsh/w6w-wrappers.git", upstream: "https://github.com/w6w-io/w6w-wrappers.git" },
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  const bytes = writes.get("clients/start.md")!;
  for (const line of [
    'description: "Get going."',
    'sourceRepo: "w6w-io/w6w-wrappers"',
    'sourcePath: "node/docs/guide/start.md"',
    'sourceSha: "blob-wrappers/node/docs/guide/start.md"',
    'sourceRefSha: "head-wrappers"',
    'sourceUrl: "https://github.com/w6w-io/w6w-wrappers/blob/head-wrappers/node/docs/guide/start.md"',
    `syncedAt: "${DATE}"`,
  ]) {
    assert.ok(bytes.includes(`\n${line}\n`), `missing ${line} in:\n${bytes}`);
  }
  assert.ok(bytes.endsWith("\n# Page\n"), "the source's own frontmatter is replaced, its body kept");
  assert.equal(bytes.split("\n---\n").length, 2, "exactly one frontmatter block");
});

test("provenance: with no upstream remote, origin names the repo", async () => {
  const { deps, writes } = fakeDeps({
    files: rootFiles(fixtureSources(1)),
    remotes: { core: { origin: "https://github.com/segevsh/w6w-core.git" } },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0);
  assert.match(writes.get("reference-spec/f0.md")!, /\nsourceRepo: "segevsh\/w6w-core"\n/);
});

test("provenance: a repo with neither remote fails the run", async () => {
  const { deps, writes } = fakeDeps({ files: rootFiles(fixtureSources(1)), remotes: { core: {} } });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.match(result.failures[0].error, /no upstream or origin remote/);
});

test("provenance: a file outside any git repo fails the run", async () => {
  const { deps } = fakeDeps({ files: rootFiles(fixtureSources(1)), repos: [] });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.failures[0].error, /not a git repository/);
});

// --- Source frontmatter ------------------------------------------------------------------------

test("shared: false skips the page, reports it, and prunes its previously-published output", async () => {
  const files = studioFiles({
    "studio/docs/overview.md": page({ title: "Overview", section: "guides", shared: false }),
  });
  const { deps, writes, removed } = fakeDeps({ files }, {
    listExisting: async () => ["guides/overview.md"],
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.skipped, ["studio/docs/overview.md"]);
  assert.ok(!writes.has("guides/overview.md"));
  assert.deepEqual(removed, ["guides/overview.md"]);
});

test("a source whose frontmatter title or section disagrees with its manifest entry fails the run", async () => {
  for (const [key, value] of [["title", "Overview!"], ["section", "clients"], ["key", "intro"]]) {
    const files = studioFiles({
      "studio/docs/overview.md": page({ key: "overview", title: "Overview", section: "guides", [key]: value }),
    });
    const { deps, writes } = fakeDeps({ files });

    const result = await runImport(deps, OPTIONS);

    assert.notEqual(result.exitCode, 0, `${key} mismatch must fail`);
    assert.equal(writes.size, 0);
    assert.equal(result.failures[0].at, "studio/docs/overview.md");
    assert.match(result.failures[0].error, new RegExp(`frontmatter ${key}`));
  }
});

test("a docs/ file with no frontmatter fails the run; a root-resolved file with none imports", async () => {
  const files = { ...rootFiles(fixtureSources(1)), ...studioFiles({ "studio/docs/overview.md": "# Overview\n" }) };
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.failures.map((f) => f.at), ["studio/docs/overview.md"]);
  assert.equal(writes.size, 0);

  const rootOnly = fakeDeps({ files: rootFiles(fixtureSources(1)) });
  const ok = await runImport(rootOnly.deps, OPTIONS);
  assert.equal(ok.exitCode, 0, JSON.stringify(ok.failures));
  assert.ok(rootOnly.writes.has("reference-spec/f0.md"), "the root file without frontmatter imports");
});

// --- Uncommitted changes -------------------------------------------------------------------------

test("a listed file with uncommitted changes fails the run, naming it", async () => {
  const { deps, writes } = fakeDeps({ files: studioFiles(), dirty: ["studio/docs/workflows/triggers.md"] });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].at, "studio/docs/workflows/triggers.md");
  assert.match(result.failures[0].error, /uncommitted changes in w6w-io\/w6w-studio:docs\/workflows\/triggers\.md/);
  assert.match(result.failures[0].error, /--allow-dirty/);
});

test("--allow-dirty collects a dirty file and reports it; a never-committed one is dated by the repo's last commit", async () => {
  const { deps, writes } = fakeDeps({
    files: studioFiles(),
    dirty: ["studio/docs/overview.md", "studio/docs/workflows/triggers.md"],
    uncommitted: ["studio/docs/workflows/triggers.md"],
  });

  const result = await runImport(deps, { root: ROOT, allowDirty: true });

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.dirty, ["studio/docs/overview.md", "studio/docs/workflows/triggers.md"]);
  assert.match(writes.get("guides/overview.md")!, new RegExp(`\nsyncedAt: "${DATE}"\n`));
  assert.match(writes.get("guides/workflows/triggers.md")!, /\nsyncedAt: "2025-12-31T00:00:00Z"\n/);
});

test("a shared: false draft is never checked for uncommitted changes", async () => {
  const files = studioFiles({
    "studio/docs/overview.md": page({ title: "Overview", section: "guides", shared: false }),
  });
  const { deps } = fakeDeps({ files, dirty: ["studio/docs/overview.md"] });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.deepEqual(result.skipped, ["studio/docs/overview.md"]);
});

// --- Closed sections and `summary` ---------------------------------------------------------------

test("a manifest entry with a section outside SECTIONS fails the run, naming manifest and entry index", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "studio/docs/manifest.json": manifest([
        { path: "a.md", slug: "a", section: "guides", title: "A" },
        { path: "b.md", slug: "b", section: "studio", title: "B" },
      ]),
      "studio/docs/a.md": page({ title: "A", section: "guides" }),
      "studio/docs/b.md": page({ title: "B", section: "studio" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0, "the valid sibling is not written either");
  const failure = result.failures.find((f) => f.at === "studio/docs/manifest.json");
  assert.ok(failure, JSON.stringify(result.failures));
  assert.match(failure!.error, /entry 1/);
  assert.match(failure!.error, /studio/);
});

test("summary: a manifest entry's summary lands in the rendered frontmatter; absent renders null", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "studio/docs/manifest.json": manifest([
        { path: "a.md", slug: "a", section: "guides", title: "A", summary: "Do the A thing." },
        { path: "b.md", slug: "b", section: "guides", title: "B" },
      ]),
      "studio/docs/a.md": page({ title: "A", section: "guides" }),
      "studio/docs/b.md": page({ title: "B", section: "guides" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.match(writes.get("guides/a.md")!, /\nsummary: "Do the A thing\."\n/);
  assert.match(writes.get("guides/b.md")!, /\nsummary: null\n/);
});

test("a non-string summary fails the run", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "studio/docs/manifest.json": manifest([{ path: "a.md", slug: "a", section: "guides", title: "A", summary: 7 }]),
      "studio/docs/a.md": page({ title: "A", section: "guides" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.match(result.failures[0].error, /summary/);
});

// --- Link rewriting (wired after gathering, before the write phase) ------------------------------

/** Two repos: `wrappers` (public) holding a page whose body is `body`, and the files it may link to. */
function linkWorld(body: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    "wrappers/docs/manifest.json": manifest([
      { path: "a.md", slug: "a", section: "clients", title: "A" },
      { path: "b.md", slug: "b", section: "guides", title: "B" },
    ]),
    "wrappers/docs/a.md": page({ title: "A", section: "clients" }, body),
    "wrappers/docs/b.md": page({ title: "B", section: "guides" }, "# B\n"),
    "wrappers/docs/notes.md": "uncollected\n",
    ...extra,
  };
}

test("links: a collected target becomes its site route (fragment kept), regardless of manifest order", async () => {
  const { deps, writes } = fakeDeps({ files: linkWorld("See [b](b.md#top).\n") });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.match(writes.get("clients/a.md")!, /See \[b\]\(\/guides\/b\/#top\)\./);
});

test("links: an uncollected same-repo public file becomes a GitHub blob URL at sourceRefSha", async () => {
  const { deps, writes } = fakeDeps({ files: linkWorld("[n](notes.md)\n") });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.match(
    writes.get("clients/a.md")!,
    /\[n\]\(https:\/\/github\.com\/w6w-io\/w6w-wrappers\/blob\/head-wrappers\/docs\/notes\.md\)/,
  );
});

test("links: a shared: false draft is not collected, so a link to it is an uncollected target", async () => {
  const files = linkWorld("[b](b.md)\n", { "wrappers/docs/b.md": page({ title: "B", section: "guides", shared: false }) });
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  assert.match(writes.get("clients/a.md")!, /\]\(https:\/\/github\.com\/w6w-io\/w6w-wrappers\/blob\/head-wrappers\/docs\/b\.md\)/);
});

test("links: an uncollected file in a private repo fails the run — nothing written, page and target named", async () => {
  for (const repo of ["server", "studio", "control", "admin"]) {
    const { deps, writes } = fakeDeps({
      files: linkWorld(`[x](../../${repo}/src/x.ts)\n`, { [`${repo}/src/x.ts`]: "x\n" }),
    });

    const result = await runImport(deps, OPTIONS);

    assert.notEqual(result.exitCode, 0, repo);
    assert.equal(writes.size, 0, repo);
    const failure = result.failures.find((f) => f.at === "wrappers/docs/a.md");
    assert.ok(failure, JSON.stringify(result.failures));
    assert.ok(failure!.error.includes(`../../${repo}/src/x.ts`), failure!.error);
  }
});

test("links: a link escaping its repo fails the run, even when the destination is itself collected", async () => {
  const files = linkWorld("[b](../../core/rfcs/f0.md)\n", rootFiles(fixtureSources(1)));
  const { deps, writes } = fakeDeps({ files });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.ok(result.failures.some((f) => f.at === "wrappers/docs/a.md"));
});

test("links: images, reference definitions are rewritten; fenced code and absolute links are untouched", async () => {
  const body = [
    "![pic](notes.md)",
    "",
    "[ref]: b.md",
    "",
    "```md",
    "[code](b.md)",
    "```",
    "",
    "[ext](https://example.com/x.md) [anchor](#top)",
    "",
  ].join("\n");
  const { deps, writes } = fakeDeps({ files: linkWorld(body) });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  const out = writes.get("clients/a.md")!;
  assert.match(out, /!\[pic\]\(https:\/\/github\.com\/w6w-io\/w6w-wrappers\/blob\/head-wrappers\/docs\/notes\.md\)/);
  assert.match(out, /^\[ref\]: \/guides\/b\/$/m);
  assert.match(out, /\[code\]\(b\.md\)/);
  assert.match(out, /\[ext\]\(https:\/\/example\.com\/x\.md\) \[anchor\]\(#top\)/);
});

// --- The generated HTTP-API page -----------------------------------------------------------------

const ENDPOINTS = JSON.stringify({
  $comment: "SECRET-COMMENT",
  basePath: "/v1",
  operations: [
    {
      name: "run",
      summary: "Run a thing.",
      method: "POST",
      path: "/run",
      serverImplemented: true,
      params: [],
      returns: "RunResult",
      naming: { ts: "client.run()", python: "client.run()", cli: "w6w run" },
      notes: "NOTES-D15",
    },
    {
      name: "ghost",
      summary: "Not built.",
      method: "GET",
      path: "/ghost",
      serverImplemented: false,
      params: [],
      returns: "X",
      naming: { ts: "a", python: "b", cli: "c" },
    },
  ],
});

test("generated page: wrappers/endpoints.json becomes reference-api/http-api with the wrappers provenance", async () => {
  const { deps, writes } = fakeDeps({ files: { ...studioFiles(), "wrappers/endpoints.json": ENDPOINTS } });

  const result = await runImport(deps, OPTIONS);

  assert.equal(result.exitCode, 0, JSON.stringify(result.failures));
  const bytes = writes.get("reference-api/http-api.md")!;
  assert.ok(bytes, JSON.stringify([...writes.keys()]));
  for (const line of [
    'key: "http-api"',
    'title: "HTTP API"',
    'section: "reference-api"',
    'sourceRepo: "w6w-io/w6w-wrappers"',
    'sourcePath: "endpoints.json"',
    'sourceSha: "blob-wrappers/endpoints.json"',
    'sourceRefSha: "head-wrappers"',
    `syncedAt: "${DATE}"`,
  ]) {
    assert.ok(bytes.includes(`\n${line}\n`), `missing ${line} in:\n${bytes}`);
  }
  assert.match(bytes, /^## run$/m);
  assert.ok(!bytes.includes("ghost"), "serverImplemented: false is excluded");
  for (const leaked of ["SECRET-COMMENT", "NOTES-D15", "serverImplemented"]) {
    assert.ok(!bytes.includes(leaked), `${leaked} must never be emitted`);
  }
});

test("generated page: no endpoints.json (or no wrappers dir) skips it without failing", async () => {
  const without = fakeDeps({ files: studioFiles() });
  const a = await runImport(without.deps, OPTIONS);
  assert.equal(a.exitCode, 0, JSON.stringify(a.failures));
  assert.ok(!without.writes.has("reference-api/http-api.md"));

  const bare = fakeDeps({ files: { ...studioFiles(), "wrappers/README.md": "x\n" } });
  const b = await runImport(bare.deps, OPTIONS);
  assert.equal(b.exitCode, 0, JSON.stringify(b.failures));
  assert.ok(!bare.writes.has("reference-api/http-api.md"));
});

test("generated page: unparseable endpoints.json fails the run and writes nothing", async () => {
  const { deps, writes } = fakeDeps({ files: { ...studioFiles(), "wrappers/endpoints.json": "{nope" } });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].at, "wrappers/endpoints.json");
});

test("generated page: a manifest entry claiming reference-api/http-api collides with it", async () => {
  const { deps, writes } = fakeDeps({
    files: {
      "wrappers/endpoints.json": ENDPOINTS,
      "core/docs/manifest.json": manifest([{ path: "h.md", slug: "http-api", section: "reference-api", title: "Mine" }]),
      "core/docs/h.md": page({ title: "Mine", section: "reference-api" }),
    },
  });

  const result = await runImport(deps, OPTIONS);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  const failure = result.failures.find((f) => /reference-api, http-api/.test(f.error));
  assert.ok(failure, JSON.stringify(result.failures));
  assert.match(failure!.error, /wrappers\/endpoints\.json/);
  assert.match(failure!.error, /core\/docs\/h\.md/);
});

test("generated page: honours a .docsignore on wrappers, and the dirty-file rule", async () => {
  const ignored = fakeDeps({
    files: { ...studioFiles(), "wrappers/endpoints.json": ENDPOINTS, "wrappers/.docsignore": "" },
  });
  const a = await runImport(ignored.deps, OPTIONS);
  assert.equal(a.exitCode, 0, JSON.stringify(a.failures));
  assert.ok(!ignored.writes.has("reference-api/http-api.md"));

  const dirty = fakeDeps({
    files: { ...studioFiles(), "wrappers/endpoints.json": ENDPOINTS },
    dirty: ["wrappers/endpoints.json"],
  });
  const b = await runImport(dirty.deps, OPTIONS);
  assert.notEqual(b.exitCode, 0);
  assert.equal(dirty.writes.size, 0);
  assert.equal(b.failures[0].at, "wrappers/endpoints.json");
  assert.match(b.failures[0].error, /uncommitted changes/);
});

test("generated page: is deterministic — a second run over the same world rewrites nothing", async () => {
  const world = { ...studioFiles(), "wrappers/endpoints.json": ENDPOINTS };
  const first = fakeDeps({ files: world });
  await runImport(first.deps, OPTIONS);
  const second = fakeDeps({ files: world }, { readExisting: async (path) => first.writes.get(path) ?? null });

  const result = await runImport(second.deps, OPTIONS);

  assert.equal(result.written.length, 0);
  assert.ok(result.unchanged.includes("reference-api/http-api.md"));
});

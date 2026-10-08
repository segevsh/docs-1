// Run: node --test src/lib/__tests__/doc-sources.test.ts   (no filesystem, no git, no clock)
//
// Covers the pure core the docs importer is built on: the closed section list, discovery's
// skip rules, manifest grammar and entry validation (`expandManifest`, `roots`, `summary`), the merge/dedup rule
// (`mergeSources`), sub-page parentage, the output-path scheme, remote-URL parsing, frontmatter
// parsing/checking and `renderDocFile`'s shape/determinism. The trust-boundary behaviour
// ("discover + read + stamp every source, write nothing on any failure") lives in
// `import-docs.test.ts` instead — nothing here can prove that, because `runImport` is not this
// module's job.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  checkSourceMeta,
  expandManifest,
  isSkippedDirName,
  mergeSources,
  orphanedSubPages,
  outputPath,
  parentSlug,
  parseFrontmatter,
  parseRepoSlug,
  PRIVATE_REPOS,
  renderDocFile,
  SECTIONS,
  sourceUrl,
  stripFrontmatter,
} from "../doc-sources.ts";
import type { DocSource, Provenance, SourceMeta } from "../doc-sources.ts";

const META: SourceMeta = { description: "", format: "markdown", shared: true };
const PROVENANCE: Provenance = {
  sourceRepo: "w6w-io/w6w-core",
  sourcePath: "README.md",
  sourceSha: "b10b",
  sourceRefSha: "c0ffee",
  syncedAt: "2026-01-01T00:00:00Z",
};

function manifestSource(overrides: Partial<DocSource> = {}): DocSource {
  return {
    file: "studio/docs/overview.md",
    section: "guides",
    slug: "overview",
    title: "Overview",
    order: null,
    position: 0,
    summary: null,
    origin: "docs",
    ...overrides,
  };
}

test("SECTIONS is exactly the 8 closed ids in pinned rail order", () => {
  assert.deepEqual([...SECTIONS], [
    "get-started",
    "guides",
    "clients",
    "self-hosting",
    "build-apps",
    "reference-spec",
    "reference-api",
    "reference-packages",
  ]);
});

test("PRIVATE_REPOS is exactly server, studio, control, admin", () => {
  assert.deepEqual([...PRIVATE_REPOS], ["server", "studio", "control", "admin"]);
});

test("outputPath is <section>/<slug>.md, and a sub-page nests under its parent's folder", () => {
  assert.equal(outputPath({ section: "reference-spec", slug: "app-contract" }), "reference-spec/app-contract.md");
  assert.equal(outputPath({ section: "guides", slug: "workflows/triggers" }), "guides/workflows/triggers.md");
});

test("the removed pinned list stays removed: no DOC_SOURCES / PINNED / RFCS in doc-sources.ts", () => {
  const src = readFileSync(fileURLToPath(new URL("../doc-sources.ts", import.meta.url)), "utf8");
  assert.ok(!/\b(DOC_SOURCES|PINNED|RFCS)\b/.test(src));
});

// --- Discovery skip rules ---------------------------------------------------------------------

test("isSkippedDirName: node_modules, dist, build and every dot-directory are skipped; docs is not", () => {
  for (const name of ["node_modules", "dist", "build", ".git", ".worktrees", ".astro"]) {
    assert.ok(isSkippedDirName(name), name);
  }
  for (const name of ["docs", "packages", "src", "builder", "distro"]) {
    assert.ok(!isSkippedDirName(name), name);
  }
});

// --- Manifest entry validation (expandManifest) --------------------------------------------

test("expandManifest: a well-formed manifest expands every entry, anchored under its package", () => {
  const raw = JSON.stringify({
    docs: [
      { path: "overview.md", slug: "overview", section: "guides", title: "Overview", order: 0 },
      { path: "workflows/triggers.md", slug: "workflows/triggers", section: "guides", title: "Triggers" },
    ],
  });
  const result = expandManifest("studio/docs/manifest.json", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.sources, [
    manifestSource({ order: 0 }),
    manifestSource({
      file: "studio/docs/workflows/triggers.md",
      slug: "workflows/triggers",
      title: "Triggers",
      position: 1,
    }),
  ]);
});

test("expandManifest: a manifest nested deeper in a package resolves under that docs/", () => {
  const raw = JSON.stringify({ docs: [{ path: "node.md", slug: "node", section: "clients", title: "Node" }] });
  const result = expandManifest("wrappers/node/docs/manifest.json", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.sources[0].file, "wrappers/node/docs/node.md");
});

test("expandManifest: unparseable JSON is a manifest-level failure", () => {
  const result = expandManifest("ui/docs/manifest.json", "not json{{{");
  assert.ok("manifestError" in result);
});

test("expandManifest: missing 'docs' array is a manifest-level failure", () => {
  const result = expandManifest("ui/docs/manifest.json", JSON.stringify({ notDocs: [] }));
  assert.ok("manifestError" in result);
});

test("expandManifest: an entry missing 'slug' fails that entry, naming the manifest and index — siblings still expand", () => {
  const raw = JSON.stringify({
    docs: [
      { path: "a.md", section: "guides", title: "A" }, // missing slug
      { path: "b.md", slug: "b", section: "guides", title: "B" },
    ],
  });
  const result = expandManifest("ui/docs/manifest.json", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].index, 0);
  assert.match(result.failures[0].error, /ui\/docs\/manifest\.json/);
  assert.match(result.failures[0].error, /entry 0/);
  assert.match(result.failures[0].error, /slug/);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].slug, "b");
});

test("expandManifest: an out-of-range slug fails that entry — one or two segments, never index", () => {
  for (const bad of ["Foo", "a/b/c", "..", "a//b", "/a", "a/", "index", "a/index", "a/B"]) {
    const raw = JSON.stringify({ docs: [{ path: "x.md", slug: bad, section: "guides", title: "X" }] });
    const result = expandManifest("ui/docs/manifest.json", raw);
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, `slug ${JSON.stringify(bad)} must be refused`);
    assert.equal(result.failures.length, 1);
  }
});

test("expandManifest: a two-segment slug and a hyphenated section are accepted", () => {
  const raw = JSON.stringify({
    docs: [{ path: "x.md", slug: "get-started/install", section: "self-hosting", title: "X" }],
  });
  const result = expandManifest("ui/docs/manifest.json", raw);
  assert.ok("sources" in result && result.sources.length === 1);
});

test("expandManifest: a non-integer order fails that entry", () => {
  for (const bad of [1.5, "3", true]) {
    const raw = JSON.stringify({ docs: [{ path: "x.md", slug: "x", section: "guides", title: "X", order: bad }] });
    const result = expandManifest("ui/docs/manifest.json", raw);
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, `order ${JSON.stringify(bad)} must be refused`);
    assert.match(result.failures[0].error, /order/);
  }
});

test("expandManifest: the sink — a traversal path never produces a file outside that docs/", () => {
  for (const bad of ["../../../README.md", "../README.md", "workflows/../../secret.md", "workflows/../../../x.md"]) {
    const raw = JSON.stringify({ docs: [{ path: bad, slug: "evil", section: "guides", title: "Evil" }] });
    const result = expandManifest("core/docs/manifest.json", raw);
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, `path ${JSON.stringify(bad)} must be refused`);
    assert.match(result.failures[0].error, /escapes docs\//);
  }
});

test("expandManifest: a subfolder path that cancels out inside docs/ is canonicalized, not refused", () => {
  const raw = JSON.stringify({
    docs: [{ path: "workflows/../overview.md", slug: "overview", section: "guides", title: "O" }],
  });
  const result = expandManifest("studio/docs/manifest.json", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.sources[0].file, "studio/docs/overview.md");
});

// --- Closed sections, unknown keys, summary -----------------------------------------------------

function expand(manifest: unknown, file = "core/docs/manifest.json") {
  return expandManifest(file, JSON.stringify(manifest));
}
const ENTRY = { path: "x.md", slug: "x", section: "guides", title: "X" };

test("expandManifest: every closed section is accepted", () => {
  for (const section of SECTIONS) {
    const result = expand({ docs: [{ ...ENTRY, section }] });
    assert.ok("sources" in result && result.sources.length === 1, section);
  }
});

test("expandManifest: a section outside the closed list fails, naming the manifest and entry index", () => {
  for (const bad of ["studio", "packages", "Guides", "reference", "app-contract", ""]) {
    const result = expand({ docs: [ENTRY, { ...ENTRY, slug: "y", section: bad }] });
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 1, `section ${JSON.stringify(bad)} must be refused`);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].index, 1);
    assert.match(result.failures[0].error, /core\/docs\/manifest\.json entry 1/);
    assert.match(result.failures[0].error, /section/);
  }
});

test("expandManifest: an unknown entry key fails that entry (a typo'd key must not vanish)", () => {
  for (const key of ["sumary", "group", "draft", "key"]) {
    const result = expand({ docs: [{ ...ENTRY, [key]: "v" }] });
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, key);
    assert.match(result.failures[0].error, new RegExp(`unknown key "${key}"`));
  }
});

test("expandManifest: an unknown top-level key is a manifest-level failure", () => {
  const result = expand({ docs: [ENTRY], extra: 1 });
  assert.ok("manifestError" in result);
  if ("manifestError" in result) assert.match(result.manifestError, /unknown top-level key "extra"/);
});

test("expandManifest: summary is carried onto the source; absent is null; a non-string fails", () => {
  const ok = expand({ docs: [{ ...ENTRY, summary: "One line." }, { ...ENTRY, slug: "y" }] });
  assert.ok("sources" in ok);
  if ("sources" in ok) assert.deepEqual(ok.sources.map((s) => s.summary), ["One line.", null]);
  for (const bad of [1, null, true, ["a"], {}]) {
    const result = expand({ docs: [{ ...ENTRY, summary: bad }] });
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, `summary ${JSON.stringify(bad)} must be refused`);
    assert.match(result.failures[0].error, /summary/);
  }
});

// --- roots -------------------------------------------------------------------------------------

test("expandManifest: an entry under a declared root (or equal to one) resolves, as origin 'root'", () => {
  const result = expand({
    roots: ["rfcs", "README.md"],
    docs: [
      { ...ENTRY, path: "../rfcs/app.md", slug: "a" },
      { ...ENTRY, path: "../README.md", slug: "b" },
      { ...ENTRY, path: "../rfcs/sub/deep.md", slug: "c" },
      { ...ENTRY, path: "guide.md", slug: "d" },
    ],
  });
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.sources.map((s) => [s.file, s.origin]), [
    ["core/rfcs/app.md", "root"],
    ["core/README.md", "root"],
    ["core/rfcs/sub/deep.md", "root"],
    ["core/docs/guide.md", "docs"],
  ]);
});

test("expandManifest: roots are repo-relative to the manifest's package, however deep", () => {
  const result = expand(
    { roots: ["README.md"], docs: [{ ...ENTRY, path: "../README.md" }] },
    "wrappers/node/docs/manifest.json",
  );
  assert.ok("sources" in result);
  if ("sources" in result) assert.equal(result.sources[0].file, "wrappers/node/README.md");
});

test("expandManifest: a root is canonicalized once — a trailing slash or inner ./ still matches", () => {
  const result = expand({ roots: ["rfcs/", "./notes/./x"], docs: [
    { ...ENTRY, path: "../rfcs/a.md", slug: "a" },
    { ...ENTRY, path: "../notes/x/b.md", slug: "b" },
  ] });
  assert.ok("sources" in result && result.sources.length === 2);
});

test("expandManifest: an invalid root fails the whole manifest", () => {
  for (const bad of ["..", "../x", "a/../..", "/etc", "/", "docs", "docs/x", "docs/", "rfcs/../docs", ".", "", "a\\b", 3, null]) {
    const result = expand({ roots: [bad], docs: [ENTRY] });
    assert.ok("manifestError" in result, `root ${JSON.stringify(bad)} must be refused`);
    if ("manifestError" in result) assert.match(result.manifestError, /invalid root/);
  }
  assert.ok("manifestError" in expand({ roots: "rfcs", docs: [ENTRY] }));
});

test("expandManifest: an entry under an UNdeclared sibling dir, or with no roots at all, is refused", () => {
  for (const manifest of [
    { docs: [{ ...ENTRY, path: "../rfcs/app.md" }] },
    { roots: ["rfcs"], docs: [{ ...ENTRY, path: "../src/app.md" }] },
    { roots: ["rfcs"], docs: [{ ...ENTRY, path: "../rfcs-other/app.md" }] },
    { roots: ["README.md"], docs: [{ ...ENTRY, path: "../README.md.bak" }] },
  ]) {
    const result = expand(manifest);
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, JSON.stringify(manifest));
    assert.match(result.failures[0].error, /escapes docs\//);
  }
});

test("expandManifest: an entry cannot escape through a root — traversal after the root is refused", () => {
  for (const bad of ["../rfcs/../../server/x.md", "../rfcs/../../x.md", "../rfcs/../src/x.md", "../../core/rfcs/a.md"]) {
    const result = expand({ roots: ["rfcs"], docs: [{ ...ENTRY, path: bad }] });
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, bad);
  }
});

test("expandManifest: existing traversal cases stay refused even with roots declared", () => {
  for (const bad of ["../../../README.md", "../README.md", "workflows/../../secret.md", "workflows/../../../x.md"]) {
    const result = expand({ roots: ["rfcs"], docs: [{ ...ENTRY, path: bad }] });
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, bad);
  }
});

test("expandManifest: a root whose resolution lands back in docs/ is just a docs/ file", () => {
  const result = expand({ roots: ["rfcs"], docs: [{ ...ENTRY, path: "../rfcs/../docs/x.md" }] });
  assert.ok("sources" in result && result.sources[0].origin === "docs");
});

// --- mergeSources ------------------------------------------------------------------------------

test("mergeSources: identical (section, slug) from the SAME file dedups — the later entry wins", () => {
  const first = manifestSource({ order: null });
  const later = manifestSource({ order: 5, position: 1 });
  const { sources, collisions } = mergeSources([first, later]);
  assert.deepEqual(sources, [later]);
  assert.deepEqual(collisions, []);
});

test("mergeSources: identical (section, slug) from a DIFFERENT file collides, naming both", () => {
  const { collisions } = mergeSources([
    manifestSource({ file: "ui/docs/a.md" }),
    manifestSource({ file: "ui/docs/other.md" }),
  ]);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].a.file, "ui/docs/a.md");
  assert.equal(collisions[0].b.file, "ui/docs/other.md");
});

// --- Sub-pages ---------------------------------------------------------------------------------

test("parentSlug: a sub-page's parent is its first segment; a top-level page has none", () => {
  assert.equal(parentSlug("workflows/triggers"), "workflows");
  assert.equal(parentSlug("workflows"), null);
});

test("orphanedSubPages: a sub-page needs its parent in the SAME section", () => {
  const parent = manifestSource({ slug: "workflows", file: "studio/docs/workflows/index.md" });
  const child = manifestSource({ slug: "workflows/triggers", file: "studio/docs/workflows/triggers.md" });
  const elsewhere = manifestSource({ section: "clients", slug: "workflows", file: "ui/docs/w.md" });

  assert.deepEqual(orphanedSubPages([parent, child]), []);
  assert.deepEqual(orphanedSubPages([child]), [child]);
  assert.deepEqual(orphanedSubPages([elsewhere, child]), [child], "a same-named page in another section is not a parent");
});

// --- Remote URLs -------------------------------------------------------------------------------

test("parseRepoSlug: https, scp-style and ssh:// remotes all yield owner/name", () => {
  assert.equal(parseRepoSlug("https://github.com/w6w-io/w6w-core.git"), "w6w-io/w6w-core");
  assert.equal(parseRepoSlug("https://github.com/w6w-io/docs"), "w6w-io/docs");
  assert.equal(parseRepoSlug("git@github.com:w6w-io/w6w-ui.git\n"), "w6w-io/w6w-ui");
  assert.equal(parseRepoSlug("ssh://git@github.com/w6w-io/w6w-studio.git/"), "w6w-io/w6w-studio");
  assert.equal(parseRepoSlug("not-a-url"), null);
});

test("sourceUrl is the GitHub blob link at the given commit", () => {
  assert.equal(
    sourceUrl("w6w-io/w6w-core", "abc123", "rfcs/app.md"),
    "https://github.com/w6w-io/w6w-core/blob/abc123/rfcs/app.md",
  );
});

// --- Frontmatter -------------------------------------------------------------------------------

test("parseFrontmatter decodes JSON scalars, single-quoted and bare strings", () => {
  const text = [
    "---",
    "id: null",
    'key: "workflows/triggers"',
    "title: 'It''s here'",
    "section: studio",
    "shared: false",
    "order: 3",
    "---",
    "",
    "# Body",
  ].join("\n");
  const parsed = parseFrontmatter(text);
  assert.ok(parsed);
  assert.deepEqual(parsed!.fields, {
    id: null,
    key: "workflows/triggers",
    title: "It's here",
    section: "studio",
    shared: false,
    order: 3,
  });
  assert.equal(parsed!.body, "\n# Body");
});

test("parseFrontmatter: a comment line inside the block means it is not frontmatter", () => {
  assert.equal(parseFrontmatter("---\n# a comment\ntitle: x\n---\nbody"), null);
});

test("stripFrontmatter: a leading --- block whose lines are all key: value pairs is stripped", () => {
  const body = ["---", 'title: "X"', "section: guides", "---", "", "# Real heading", ""].join("\n");
  const stripped = stripFrontmatter(body);
  assert.ok(!stripped.includes("title:"));
  assert.ok(stripped.includes("# Real heading"));
});

test("stripFrontmatter: a README opening with a --- horizontal rule (and a second, unrelated --- later) is untouched", () => {
  // Two "---" occurrences below, neither a real frontmatter pair: the block between them is
  // ordinary prose, not key: value lines — the exact shape the greedy "delete up to the SECOND
  // ---" mutant gets wrong.
  const body = [
    "---",
    "",
    "# My Project",
    "",
    "Some introductory prose that is not frontmatter at all.",
    "",
    "## Another section",
    "",
    "More prose, followed by a literal rule below.",
    "",
    "---",
    "",
    "Trailing content.",
    "",
  ].join("\n");
  assert.equal(stripFrontmatter(body), body);
});

test("stripFrontmatter: no second --- at all leaves the body untouched", () => {
  const body = "---\n\n# Heading\n\nProse.\n";
  assert.equal(stripFrontmatter(body), body);
});

test("checkSourceMeta: a root-resolved source with no frontmatter gets the defaults", () => {
  assert.deepEqual(checkSourceMeta(manifestSource({ file: "core/README.md", origin: "root" }), null), META);
});

test("checkSourceMeta: a docs/ source with no frontmatter fails", () => {
  const result = checkSourceMeta(manifestSource(), null);
  assert.ok("errors" in result);
});

test("checkSourceMeta: the contract's frontmatter (nulls and all) yields its description and shared", () => {
  const fields = {
    id: null,
    key: "overview",
    title: "Overview",
    section: "guides",
    description: "What you get.",
    format: "markdown",
    shared: true,
    sourceRepo: null,
    syncedAt: null,
  };
  assert.deepEqual(checkSourceMeta(manifestSource(), fields), {
    description: "What you get.",
    format: "markdown",
    shared: true,
  });
});

test("checkSourceMeta: a title, section or key that disagrees with the manifest fails, naming both values", () => {
  const base = { key: "overview", title: "Overview", section: "guides" };
  for (const [key, value] of [["title", "Something else"], ["section", "clients"], ["key", "other"]]) {
    const result = checkSourceMeta(manifestSource(), { ...base, [key]: value });
    assert.ok("errors" in result, `${key} mismatch must fail`);
    if (!("errors" in result)) continue;
    assert.match(result.errors[0], new RegExp(key));
    assert.match(result.errors[0], new RegExp(JSON.stringify(value)));
  }
});

test("checkSourceMeta: a manifest source's frontmatter must carry title and section", () => {
  const result = checkSourceMeta(manifestSource(), { title: "Overview" });
  assert.ok("errors" in result);
  if ("errors" in result) assert.match(result.errors.join("\n"), /no section/);
});

test("checkSourceMeta: shared: false is reported, and a non-boolean shared fails", () => {
  const base = { title: "Overview", section: "guides" };
  const draft = checkSourceMeta(manifestSource(), { ...base, shared: false });
  assert.ok(!("errors" in draft) && draft.shared === false);
  assert.ok("errors" in checkSourceMeta(manifestSource(), { ...base, shared: "no" }));
});

// --- renderDocFile -----------------------------------------------------------------------------

const RENDER_KEYS = [
  "key",
  "title",
  "section",
  "description",
  "summary",
  "format",
  "shared",
  "order",
  "position",
  "sourceRepo",
  "sourcePath",
  "sourceSha",
  "sourceRefSha",
  "sourceUrl",
  "syncedAt",
];

test("renderDocFile emits the fixed key order the content schema validates", () => {
  const bytes = renderDocFile(manifestSource(), META, PROVENANCE, "hello\n");
  const keys = [...bytes.matchAll(/^([a-zA-Z]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, RENDER_KEYS);
});

test("renderDocFile's values: strings JSON-quoted, booleans and numbers bare, a missing order null", () => {
  const source = manifestSource();
  const bytes = renderDocFile(source, META, PROVENANCE, "hello\n");
  for (const line of [
    `key: ${JSON.stringify(source.slug)}`,
    `title: ${JSON.stringify(source.title)}`,
    `section: ${JSON.stringify(source.section)}`,
    'description: ""',
    "summary: null",
    'format: "markdown"',
    "shared: true",
    "order: null",
    "position: 0",
    'sourceRepo: "w6w-io/w6w-core"',
    'sourcePath: "README.md"',
    'sourceSha: "b10b"',
    'sourceRefSha: "c0ffee"',
    'sourceUrl: "https://github.com/w6w-io/w6w-core/blob/c0ffee/README.md"',
    'syncedAt: "2026-01-01T00:00:00Z"',
  ]) {
    assert.ok(bytes.includes(`\n${line}\n`), `missing line ${line}`);
  }
  const ordered = renderDocFile(manifestSource({ order: 40, slug: "workflows/triggers" }), META, PROVENANCE, "x");
  assert.ok(ordered.includes("\norder: 40\n"));
  assert.ok(ordered.includes('\nkey: "workflows/triggers"\n'));
  const summarized = renderDocFile(manifestSource({ summary: 'Say "hi"' }), META, PROVENANCE, "x");
  assert.ok(summarized.includes('\nsummary: "Say \\"hi\\""\n'));
});

test("renderDocFile appends the body unmodified after the closing frontmatter fence", () => {
  const bytes = renderDocFile(manifestSource(), META, PROVENANCE, "# Hello\n\nBody text.\n");
  assert.ok(bytes.endsWith("# Hello\n\nBody text.\n"));
  assert.equal(bytes.split("---").length, 3, "exactly one frontmatter block (two fences)");
});

test("renderDocFile is deterministic and reads no clock: two calls a tick apart match", async () => {
  const a = renderDocFile(manifestSource(), META, PROVENANCE, "body\n");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const b = renderDocFile(manifestSource(), META, PROVENANCE, "body\n");
  assert.equal(a, b);
});

// --- The pure core reads no clock, no filesystem, no git -------------------------------------

test("doc-sources.ts imports no node:fs, no node:child_process, no node:https, and calls no global fetch", () => {
  const src = readFileSync(fileURLToPath(new URL("../doc-sources.ts", import.meta.url)), "utf8");
  assert.ok(!/node:fs/.test(src), "doc-sources.ts must not import node:fs");
  assert.ok(!/node:child_process/.test(src), "doc-sources.ts must not import node:child_process");
  assert.ok(!/node:https/.test(src), "doc-sources.ts must not import node:https");
  assert.ok(!/[^.]\bfetch\(/.test(src), "doc-sources.ts must not call global fetch");
});

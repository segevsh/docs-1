// Run: node --test src/lib/__tests__/doc-sources.test.ts   (no filesystem, no git, no clock)
//
// Covers the pure core the docs importer is built on: the pinned 21-entry source list, discovery's
// skip rules, manifest entry validation (`expandManifest`), the merge/dedup rule
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
  DOC_SOURCES,
  expandManifest,
  isSkippedDirName,
  mergeSources,
  orphanedSubPages,
  outputPath,
  parentSlug,
  parseFrontmatter,
  parseRepoSlug,
  renderDocFile,
  sourceUrl,
  stripFrontmatter,
} from "../doc-sources.ts";
import type { DocSource, Provenance, SourceMeta } from "../doc-sources.ts";

const PINNED_RFCS = [
  "action",
  "app",
  "auth",
  "categories",
  "connection",
  "endpoint",
  "engine",
  "function",
  "healthcheck",
  "hook-runtime",
  "image-object",
  "invocation",
  "node-types",
  "param",
  "registry",
  "trigger",
  "workflow",
];

/** The exact 21 files the pinned list names — a set comparison, not a length check: a 20-entry
 *  port (missing `docs/build-a-w6w-app.md`) or a 22-entry one (with `interface.md` slipped back
 *  in, or the retired apps README) both read as "plausible" against a bare count. */
const EXPECTED_FILES = [
  "core/README.md",
  "core/docs/build-a-w6w-app.md",
  ...PINNED_RFCS.map((slug) => `core/rfcs/${slug}.md`),
  "ui/README.md",
  "wrappers/README.md",
];

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
    section: "studio",
    slug: "overview",
    title: "Overview",
    order: null,
    position: 0,
    origin: "manifest",
    ...overrides,
  };
}

test("DOC_SOURCES is exactly the 21 pinned files", () => {
  assert.deepEqual(DOC_SOURCES.map((s) => s.file).sort(), [...EXPECTED_FILES].sort());
});

test("DOC_SOURCES contains no rfcs/interface.md, no rfcs/_template.md, and nothing from apps or studio", () => {
  const files = DOC_SOURCES.map((s) => s.file);
  assert.ok(!files.includes("core/rfcs/interface.md"), "interface.md is Draft status — excluded");
  assert.ok(!files.includes("core/rfcs/_template.md"), "_template.md is not a real RFC — excluded");
  assert.ok(!files.some((f) => f.startsWith("apps/")), "apps publishes nothing");
  assert.ok(!files.some((f) => f.startsWith("studio/")), "studio publishes via its manifest only");
});

test("ui and wrappers each contribute exactly README.md — never their docs/*", () => {
  for (const pkg of ["ui", "wrappers"]) {
    const files = DOC_SOURCES.filter((s) => s.file.startsWith(`${pkg}/`)).map((s) => s.file);
    assert.deepEqual(files, [`${pkg}/README.md`]);
  }
});

test("pinned sources are unordered, positioned by declaration order, and marked pinned", () => {
  DOC_SOURCES.forEach((s, i) => {
    assert.equal(s.order, null);
    assert.equal(s.position, i);
    assert.equal(s.origin, "pinned");
  });
});

test("outputPath is unique for every one of the 21 pinned sources", () => {
  const paths = DOC_SOURCES.map((s) => outputPath(s));
  assert.equal(new Set(paths).size, paths.length);
});

test("outputPath is <section>/<slug>.md, and a sub-page nests under its parent's folder", () => {
  const sample = DOC_SOURCES.find((s) => s.slug === "workflow")!;
  assert.equal(outputPath(sample), "composition/workflow.md");
  assert.equal(outputPath({ section: "studio", slug: "workflows/triggers" }), "studio/workflows/triggers.md");
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
      { path: "overview.md", slug: "overview", section: "studio", title: "Overview", order: 0 },
      { path: "workflows/triggers.md", slug: "workflows/triggers", section: "studio", title: "Triggers" },
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
    docs: [{ path: "x.md", slug: "get-started/install", section: "self-host", title: "X" }],
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
    docs: [{ path: "workflows/../overview.md", slug: "overview", section: "studio", title: "O" }],
  });
  const result = expandManifest("studio/docs/manifest.json", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.sources[0].file, "studio/docs/overview.md");
});

// --- mergeSources ------------------------------------------------------------------------------

test("mergeSources: identical (section, slug) from the SAME file dedups — the manifest entry wins", () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "build-a-w6w-app");
  const fromManifest: DocSource = {
    file: "core/docs/build-a-w6w-app.md",
    section: "guides",
    slug: "build-a-w6w-app",
    title: "Build a w6w app",
    order: 5,
    position: 0,
    origin: "manifest",
  };
  const { sources, collisions } = mergeSources(pinned, [fromManifest]);
  assert.deepEqual(sources, [fromManifest]);
  assert.deepEqual(collisions, []);
});

test("mergeSources: identical (section, slug) from a DIFFERENT file collides, naming both", () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "ui");
  const { collisions } = mergeSources(pinned, [
    manifestSource({ file: "ui/docs/other.md", section: "packages", slug: "ui" }),
  ]);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].a.file, "ui/README.md");
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
  const elsewhere = manifestSource({ section: "guides", slug: "workflows", file: "ui/docs/w.md" });

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

test("checkSourceMeta: a pinned source with no frontmatter gets the defaults", () => {
  assert.deepEqual(checkSourceMeta(DOC_SOURCES[0], null), META);
});

test("checkSourceMeta: a manifest source with no frontmatter fails", () => {
  const result = checkSourceMeta(manifestSource(), null);
  assert.ok("errors" in result);
});

test("checkSourceMeta: the contract's frontmatter (nulls and all) yields its description and shared", () => {
  const fields = {
    id: null,
    key: "overview",
    title: "Overview",
    section: "studio",
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
  const base = { key: "overview", title: "Overview", section: "studio" };
  for (const [key, value] of [["title", "Something else"], ["section", "guides"], ["key", "other"]]) {
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
  const base = { title: "Overview", section: "studio" };
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
  const bytes = renderDocFile(DOC_SOURCES[0], META, PROVENANCE, "hello\n");
  const keys = [...bytes.matchAll(/^([a-zA-Z]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, RENDER_KEYS);
});

test("renderDocFile's values: strings JSON-quoted, booleans and numbers bare, a missing order null", () => {
  const source = DOC_SOURCES[0];
  const bytes = renderDocFile(source, META, PROVENANCE, "hello\n");
  for (const line of [
    `key: ${JSON.stringify(source.slug)}`,
    `title: ${JSON.stringify(source.title)}`,
    `section: ${JSON.stringify(source.section)}`,
    'description: ""',
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
});

test("renderDocFile appends the body unmodified after the closing frontmatter fence", () => {
  const bytes = renderDocFile(DOC_SOURCES[0], META, PROVENANCE, "# Hello\n\nBody text.\n");
  assert.ok(bytes.endsWith("# Hello\n\nBody text.\n"));
  assert.equal(bytes.split("---").length, 3, "exactly one frontmatter block (two fences)");
});

test("renderDocFile is deterministic and reads no clock: two calls a tick apart match", async () => {
  const a = renderDocFile(DOC_SOURCES[10], META, PROVENANCE, "body\n");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const b = renderDocFile(DOC_SOURCES[10], META, PROVENANCE, "body\n");
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

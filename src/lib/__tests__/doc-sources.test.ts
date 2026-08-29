// Run: node --test src/lib/__tests__/doc-sources.test.ts   (no network, no filesystem, no clock)
//
// Covers the pure core the docs importer is built on: the pinned 22-entry source list, manifest
// entry validation (`expandManifest`), the merge/dedup rule (`mergeSources`), the output-path
// scheme, frontmatter stripping and `renderDocFile`'s shape/determinism. The network-shaped
// trust-boundary behaviour ("fetch every manifest + source, write nothing on any failure") lives
// in `import-docs.test.ts` instead — nothing here can prove that, because `runImport` is not this
// module's job.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  DOC_SOURCES,
  EXCLUDED_REPOS,
  expandManifest,
  MANIFEST_REPOS,
  mergeSources,
  outputPath,
  renderDocFile,
  stripFrontmatter,
} from "../doc-sources.ts";

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

/** The exact 22 `(repo, path)` pairs the contract's A1 table pins — a set comparison, not a
 *  length check: a 21-entry port (missing `docs/build-a-w6w-app.md`) or a 23-entry one (with
 *  `interface.md` slipped back in) both read as "plausible" against a bare count. */
const EXPECTED_PAIRS: Array<[string, string]> = [
  ["w6w-io/w6w-core", "README.md"],
  ["w6w-io/w6w-core", "docs/build-a-w6w-app.md"],
  ...PINNED_RFCS.map((slug): [string, string] => ["w6w-io/w6w-core", `rfcs/${slug}.md`]),
  ["w6w-io/w6w-ui", "README.md"],
  ["w6w-io/w6w-apps", "README.md"],
  ["w6w-io/w6w-wrappers", "README.md"],
];

function pairKey([repo, path]: [string, string]): string {
  return `${repo} ${path}`;
}

test("DOC_SOURCES is exactly the 22 pinned (repo, path) pairs", () => {
  const actual = DOC_SOURCES.map((s): [string, string] => [s.repo, s.path])
    .map(pairKey)
    .sort();
  const expected = EXPECTED_PAIRS.map(pairKey).sort();
  assert.deepEqual(actual, expected);
});

test("DOC_SOURCES contains no rfcs/interface.md and no rfcs/_template.md", () => {
  const paths = DOC_SOURCES.filter((s) => s.repo === "w6w-io/w6w-core").map((s) => s.path);
  assert.ok(!paths.includes("rfcs/interface.md"), "interface.md is Draft status — excluded");
  assert.ok(!paths.includes("rfcs/_template.md"), "_template.md is not a real RFC — excluded");
});

test("core contributes README.md + the app-building guide + exactly the 17 pinned RFCs", () => {
  const corePaths = DOC_SOURCES.filter((s) => s.repo === "w6w-io/w6w-core")
    .map((s) => s.path)
    .sort();
  const expected = [
    "README.md",
    "docs/build-a-w6w-app.md",
    ...PINNED_RFCS.map((n) => `rfcs/${n}.md`),
  ].sort();
  assert.deepEqual(corePaths, expected);
});

test("ui, apps and wrappers each contribute exactly README.md — never wrappers/docs/*", () => {
  for (const repo of ["w6w-io/w6w-ui", "w6w-io/w6w-apps", "w6w-io/w6w-wrappers"]) {
    const paths = DOC_SOURCES.filter((s) => s.repo === repo).map((s) => s.path);
    assert.deepEqual(paths, ["README.md"]);
  }
});

test("MANIFEST_REPOS is exactly the four in-scope repos; w6w-io/w6w-studio is in neither it nor DOC_SOURCES", () => {
  assert.deepEqual(
    [...MANIFEST_REPOS].sort(),
    ["w6w-io/w6w-apps", "w6w-io/w6w-core", "w6w-io/w6w-ui", "w6w-io/w6w-wrappers"],
  );
  assert.ok(!MANIFEST_REPOS.includes("w6w-io/w6w-studio"));
  assert.ok(!DOC_SOURCES.some((s) => s.repo === "w6w-io/w6w-studio"));
});

test("EXCLUDED_REPOS is exactly the four verbatim strings", () => {
  assert.deepEqual(
    [...EXCLUDED_REPOS].sort(),
    [
      "w6w-io/w6w-internal-apps",
      "w6w-io/w6w-registry",
      "w6w-io/w6w-studio",
      "w6w-io/w6w-workflow",
    ],
  );
});

test("outputPath is unique for every one of the 22 pinned sources", () => {
  const paths = DOC_SOURCES.map((s) => outputPath(s));
  assert.equal(new Set(paths).size, paths.length);
});

test("outputPath is <section>/<slug>.md, relative, no leading slash", () => {
  const sample = DOC_SOURCES.find((s) => s.slug === "workflow")!;
  assert.equal(outputPath(sample), "composition/workflow.md");
});

// --- Manifest entry validation (expandManifest) --------------------------------------------

test("expandManifest: a well-formed manifest expands every entry", () => {
  const raw = JSON.stringify({
    docs: [{ path: "embedding.md", slug: "embedding", section: "guides", title: "Embedding" }],
  });
  const result = expandManifest("w6w-io/w6w-studio", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.sources, [
    {
      repo: "w6w-io/w6w-studio",
      path: "docs/embedding.md",
      slug: "embedding",
      section: "guides",
      title: "Embedding",
    },
  ]);
});

test("expandManifest: unparseable JSON is a manifest-level failure", () => {
  const result = expandManifest("w6w-io/w6w-ui", "not json{{{");
  assert.ok("manifestError" in result);
});

test("expandManifest: missing 'docs' array is a manifest-level failure", () => {
  const result = expandManifest("w6w-io/w6w-ui", JSON.stringify({ notDocs: [] }));
  assert.ok("manifestError" in result);
});

test("expandManifest: an entry missing 'slug' fails that entry, naming the repo and index — siblings still expand", () => {
  const raw = JSON.stringify({
    docs: [
      { path: "a.md", section: "guides", title: "A" }, // missing slug
      { path: "b.md", slug: "b", section: "guides", title: "B" },
    ],
  });
  const result = expandManifest("w6w-io/w6w-ui", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].index, 0);
  assert.match(result.failures[0].error, /w6w-io\/w6w-ui/);
  assert.match(result.failures[0].error, /entry 0/);
  assert.match(result.failures[0].error, /slug/);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].slug, "b");
});

test("expandManifest: an out-of-range section or slug fails that entry", () => {
  for (const bad of ["Foo", "a/b", ".."]) {
    const raw = JSON.stringify({
      docs: [{ path: "x.md", slug: bad, section: "guides", title: "X" }],
    });
    const result = expandManifest("w6w-io/w6w-ui", raw);
    assert.ok("sources" in result);
    if (!("sources" in result)) continue;
    assert.equal(result.sources.length, 0, `slug ${JSON.stringify(bad)} must be refused`);
    assert.equal(result.failures.length, 1);
  }
});

test("expandManifest: the sink — a traversal path never produces a resolved path outside docs/", () => {
  const raw = JSON.stringify({
    docs: [{ path: "../../../README.md", slug: "evil", section: "guides", title: "Evil" }],
  });
  const result = expandManifest("w6w-io/w6w-core", raw);
  assert.ok("sources" in result);
  if (!("sources" in result)) return;
  assert.equal(result.sources.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].error, /escapes docs\//);
});

// --- mergeSources (D-B) ----------------------------------------------------------------------

test("mergeSources: identical (section, slug) from the SAME (repo, path) dedups silently", () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "build-a-w6w-app");
  const manifestSources = [
    {
      repo: "w6w-io/w6w-core",
      path: "docs/build-a-w6w-app.md",
      section: "guides",
      slug: "build-a-w6w-app",
      title: "Build a w6w app",
    },
  ];
  const { sources, collisions } = mergeSources(pinned, manifestSources);
  assert.equal(sources.length, 1);
  assert.deepEqual(collisions, []);
});

test("mergeSources: identical (section, slug) from a DIFFERENT (repo, path) collides, naming both", () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "ui");
  const manifestSources = [
    { repo: "w6w-io/w6w-ui", path: "docs/other.md", section: "packages", slug: "ui", title: "Other" },
  ];
  const { collisions } = mergeSources(pinned, manifestSources);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].a.path, "README.md");
  assert.equal(collisions[0].b.path, "docs/other.md");
});

// --- renderDocFile / frontmatter --------------------------------------------------------------

test("renderDocFile emits fixed key order: sourceRepo, sourcePath, lastChanged, title, section", () => {
  const sample = DOC_SOURCES[0];
  const bytes = renderDocFile(sample, "hello\n", "2026-01-01T00:00:00Z");
  const keys = [...bytes.matchAll(/^([a-zA-Z]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ["sourceRepo", "sourcePath", "lastChanged", "title", "section"]);
});

test("renderDocFile's frontmatter values round-trip through YAML string escaping", () => {
  const sample = DOC_SOURCES[0];
  const bytes = renderDocFile(sample, "hello\n", "2026-01-01T00:00:00Z");
  assert.ok(bytes.includes(`sourceRepo: ${JSON.stringify(sample.repo)}`));
  assert.ok(bytes.includes(`sourcePath: ${JSON.stringify(sample.path)}`));
  assert.ok(bytes.includes(`lastChanged: ${JSON.stringify("2026-01-01T00:00:00Z")}`));
  assert.ok(bytes.includes(`title: ${JSON.stringify(sample.title)}`));
  assert.ok(bytes.includes(`section: ${JSON.stringify(sample.section)}`));
});

test("renderDocFile appends the body unmodified after the closing frontmatter fence", () => {
  const sample = DOC_SOURCES[0];
  const bytes = renderDocFile(sample, "# Hello\n\nBody text.\n", "2026-01-01T00:00:00Z");
  assert.ok(bytes.endsWith("# Hello\n\nBody text.\n"));
  assert.equal(bytes.split("---").length, 3, "exactly one frontmatter block (two fences)");
});

test("renderDocFile is deterministic: identical inputs -> byte-identical output", () => {
  const sample = DOC_SOURCES[5];
  const a = renderDocFile(sample, "hello\n", "2026-01-01T00:00:00Z");
  const b = renderDocFile(sample, "hello\n", "2026-01-01T00:00:00Z");
  assert.equal(a, b);
});

test("renderDocFile reads no clock: two calls a tick apart still match", async () => {
  const sample = DOC_SOURCES[10];
  const a = renderDocFile(sample, "body\n", "2026-01-01T00:00:00Z");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const b = renderDocFile(sample, "body\n", "2026-01-01T00:00:00Z");
  assert.equal(a, b);
});

test("stripFrontmatter: a leading --- block whose lines are all key: value pairs is stripped", () => {
  const body = ["---", 'title: "X"', "section: guides", "---", "", "# Real heading", ""].join(
    "\n",
  );
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
  const stripped = stripFrontmatter(body);
  assert.equal(stripped, body);
});

test("stripFrontmatter: no second --- at all leaves the body untouched", () => {
  const body = "---\n\n# Heading\n\nProse.\n";
  assert.equal(stripFrontmatter(body), body);
});

// --- A13: pure core reads no clock, no network, no filesystem --------------------------------

test("doc-sources.ts imports no node:fs, no node:https, and calls no global fetch", () => {
  const src = readFileSync(fileURLToPath(new URL("../doc-sources.ts", import.meta.url)), "utf8");
  assert.ok(!/node:fs/.test(src), "doc-sources.ts must not import node:fs");
  assert.ok(!/node:https/.test(src), "doc-sources.ts must not import node:https");
  assert.ok(!/[^.]\bfetch\(/.test(src), "doc-sources.ts must not call global fetch");
});

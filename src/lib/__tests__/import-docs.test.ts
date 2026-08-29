// Run: node --test src/lib/__tests__/import-docs.test.ts   (fake deps, no network, no real filesystem)
//
// Exercises `runImport`'s trust-boundary behaviour directly — the thing a "catch each source's
// error and keep going" importer cannot pass, however its own tests are written: on ANY manifest
// or fetch failure, write NOTHING and name every failure; on full success, write exactly one file
// per effective source. Also exercises the manifest-driven discovery + path-traversal sink (A6)
// and the pinned/manifest merge-collision rule (A7, D-B) — these need real `runImport` + fake
// network deps, unlike `doc-sources.test.ts`'s pure-function-level equivalents.

import assert from "node:assert/strict";
import { test } from "node:test";

import { runImport } from "../import-docs.ts";
import type { ImportDeps } from "../import-docs.ts";
import { DOC_SOURCES, MANIFEST_REPOS, outputPath, renderDocFile } from "../doc-sources.ts";
import type { DocSource } from "../doc-sources.ts";

function fixtureSources(n: number): DocSource[] {
  return DOC_SOURCES.slice(0, n);
}

const EMPTY_MANIFEST = JSON.stringify({ docs: [] });

/** Fake deps with no network and no disk — a `Map` stands in for both the fetch layer and the
 *  filesystem. The default `fetchRaw` answers every `MANIFEST_REPOS` repo's `docs/manifest.json`
 *  with an empty manifest (so a test that doesn't care about manifests isn't affected by
 *  `runImport` fetching all four automatically) and every other path with a fixture body.
 *  `fetchRaw`/`fetchLastCommitDate` can be overridden per test to change or fail on demand. */
function fakeDeps(overrides: Partial<ImportDeps> = {}): { deps: ImportDeps; writes: Map<string, string> } {
  const writes = new Map<string, string>();
  const deps: ImportDeps = {
    fetchRaw: async (_repo, path) => (path === "docs/manifest.json" ? EMPTY_MANIFEST : "fixture body\n"),
    fetchLastCommitDate: async () => "2026-01-01T00:00:00Z",
    readExisting: async () => null,
    writeFile: async (path, bytes) => {
      writes.set(path, bytes);
    },
    // The collection root starts empty in most tests, so pruning is a no-op; the prune
    // behaviour itself is pinned by its own test below with a seeded orphan.
    listExisting: async () => [],
    removeFile: async (path) => {
      writes.delete(path);
    },
    ...overrides,
  };
  return { deps, writes };
}

/** Wraps a per-source `fetchRaw` with the same empty-manifest default `fakeDeps` uses, so a test
 *  focused on doc bodies doesn't have to also special-case `docs/manifest.json`. */
function fetchRawWithManifests(
  customManifests: Record<string, string>,
  otherwise: ImportDeps["fetchRaw"],
): ImportDeps["fetchRaw"] {
  return async (repo, path) => {
    if (path === "docs/manifest.json") return customManifests[repo] ?? EMPTY_MANIFEST;
    return otherwise(repo, path);
  };
}

test("all sources succeed -> exit 0, one file written per source", async () => {
  const sources = fixtureSources(5);
  const { deps, writes } = fakeDeps();

  const result = await runImport(sources, deps);

  assert.equal(result.exitCode, 0);
  assert.equal(writes.size, 5);
  assert.equal(result.written.length, 5);
  assert.deepEqual(result.failures, []);
  for (const source of sources) {
    assert.equal(writes.get(outputPath(source)), renderDocFile(source, "fixture body\n", "2026-01-01T00:00:00Z"));
  }
});

test("one failing fetchRaw -> non-zero exit, NOTHING written, the failing source named", async () => {
  const sources = fixtureSources(5);
  const target = sources[2];
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({}, async (repo, path) => {
      if (repo === target.repo && path === target.path) throw new Error("simulated 404");
      return "fixture body\n";
    }),
  });

  const result = await runImport(sources, deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0, "must write nothing when any source fails");
  assert.equal(result.written.length, 0);
  assert.equal(result.failures.length, 1);
  assert.equal((result.failures[0].source as DocSource).repo, target.repo);
  assert.equal((result.failures[0].source as DocSource).path, target.path);
  assert.match(result.failures[0].error, /simulated 404/);
});

test("one failing fetchLastCommitDate -> same hard-fail, even though the raw body fetch succeeded", async () => {
  const sources = fixtureSources(4);
  const target = sources[0];
  const { deps, writes } = fakeDeps({
    fetchLastCommitDate: async (repo, path) => {
      if (repo === target.repo && path === target.path) throw new Error("rate limited");
      return "2026-01-01T00:00:00Z";
    },
  });

  const result = await runImport(sources, deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.ok(
    result.failures.some(
      (f) => (f.source as DocSource).repo === target.repo && (f.source as DocSource).path === target.path,
    ),
  );
});

test("every source failing -> all of them are named, still nothing written", async () => {
  const sources = fixtureSources(3);
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({}, async () => {
      throw new Error("network down");
    }),
  });

  const result = await runImport(sources, deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.equal(result.failures.length, 3);
});

test("writeFile is never called before every fetch has resolved (gather-then-write, not interleaved)", async () => {
  const sources = fixtureSources(4);
  const target = sources[3]; // fails last, so an interleaved implementation would have written 3 already
  const calls: string[] = [];
  const { deps } = fakeDeps({
    fetchRaw: fetchRawWithManifests({}, async (repo, path) => {
      calls.push(`fetch:${path}`);
      if (repo === target.repo && path === target.path) throw new Error("simulated failure");
      return "fixture body\n";
    }),
    writeFile: async (path) => {
      calls.push(`write:${path}`);
    },
  });

  const result = await runImport(sources, deps);

  assert.notEqual(result.exitCode, 0);
  assert.ok(!calls.some((c) => c.startsWith("write:")), `expected no writes, got: ${calls.join(", ")}`);
});

test("a source whose rendered bytes match what's already committed is reported unchanged, not written", async () => {
  const sources = fixtureSources(2);
  const existing = new Map(
    sources.map((s) => [outputPath(s), renderDocFile(s, "fixture body\n", "2026-01-01T00:00:00Z")]),
  );
  const { deps, writes } = fakeDeps({
    readExisting: async (path) => existing.get(path) ?? null,
  });

  const result = await runImport(sources, deps);

  assert.equal(result.exitCode, 0);
  assert.equal(writes.size, 0, "byte-identical content must not be rewritten");
  assert.equal(result.unchanged.length, 2);
  assert.equal(result.written.length, 0);
});

test("a source whose content changed is written, a sibling that did not change is reported unchanged", async () => {
  const sources = fixtureSources(2);
  const [changed, same] = sources;
  const existing = new Map<string, string>([
    [outputPath(changed), renderDocFile(changed, "OLD body\n", "2025-01-01T00:00:00Z")],
    [outputPath(same), renderDocFile(same, "fixture body\n", "2026-01-01T00:00:00Z")],
  ]);
  const { deps, writes } = fakeDeps({
    readExisting: async (path) => existing.get(path) ?? null,
  });

  const result = await runImport(sources, deps);

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.written, [outputPath(changed)]);
  assert.deepEqual(result.unchanged, [outputPath(same)]);
  assert.equal(writes.size, 1);
});

test("runImport against the real 22-entry DOC_SOURCES: full success writes exactly 22 files", async () => {
  const { deps, writes } = fakeDeps();

  const result = await runImport(DOC_SOURCES, deps);

  assert.equal(result.exitCode, 0);
  assert.equal(writes.size, 22);
  assert.equal(result.written.length, 22);
});

test("runImport against the real 22-entry DOC_SOURCES: one failure writes zero of the 22", async () => {
  const target = DOC_SOURCES[5];
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({}, async (repo, path) => {
      if (repo === target.repo && path === target.path) throw new Error("simulated 404");
      return "fixture body\n";
    }),
  });

  const result = await runImport(DOC_SOURCES, deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  assert.ok(
    result.failures.some(
      (f) => (f.source as DocSource).repo === target.repo && (f.source as DocSource).path === target.path,
    ),
  );
});

test("prune: a file the effective list no longer claims is removed, and claimed files are not", async () => {
  const sources = fixtureSources(3);
  const claimed = sources.map((s) => `${s.section}/${s.slug}.md`);
  const orphan = "rfcs/moved-away.md";
  const removedPaths: string[] = [];
  const { deps } = fakeDeps({
    listExisting: async () => [...claimed, orphan],
    removeFile: async (path) => {
      removedPaths.push(path);
    },
  });

  const result = await runImport(sources, deps);

  assert.equal(result.exitCode, 0);
  // Exactly the orphan — a section rename used to leave the old file behind, so the same
  // document resolved at two routes with nothing saying which was current.
  assert.deepEqual(result.removed, [orphan]);
  assert.deepEqual(removedPaths, [orphan]);
});

test("prune never runs on the failure path — a failed fetch removes nothing", async () => {
  const removedPaths: string[] = [];
  const { deps } = fakeDeps({
    fetchRaw: fetchRawWithManifests({}, async () => {
      throw new Error("boom");
    }),
    listExisting: async () => ["rfcs/stale.md"],
    removeFile: async (path) => {
      removedPaths.push(path);
    },
  });

  const result = await runImport(fixtureSources(2), deps);

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(removedPaths, []);
});

// --- A4/A5: manifest-driven discovery ---------------------------------------------------------

test("a manifest entry missing 'slug' fails the run, naming the repo and entry index", async () => {
  const badManifest = JSON.stringify({
    docs: [{ path: "a.md", section: "guides", title: "A" }], // no slug
  });
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({ "w6w-io/w6w-ui": badManifest }, async () => "fixture body\n"),
  });

  const result = await runImport(fixtureSources(2), deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  const failure = result.failures.find((f) => /w6w-io\/w6w-ui/.test(f.error));
  assert.ok(failure, `expected a failure naming w6w-io/w6w-ui, got: ${JSON.stringify(result.failures)}`);
  assert.match(failure!.error, /entry 0/);
});

test("a missing docs/manifest.json is a failure, not an empty result", async () => {
  const { deps } = fakeDeps({
    fetchRaw: async (repo, path) => {
      if (path === "docs/manifest.json" && repo === "w6w-io/w6w-core") {
        throw new Error("404 Not Found");
      }
      return path === "docs/manifest.json" ? EMPTY_MANIFEST : "fixture body\n";
    },
  });

  const result = await runImport(fixtureSources(2), deps);

  assert.notEqual(result.exitCode, 0);
  const failure = result.failures.find((f) => /w6w-io\/w6w-core/.test(f.error));
  assert.ok(failure);
  assert.match(failure!.error, /manifest\.json/);
});

test("an out-of-range manifest section or slug (Foo, a/b, ..) fails the run", async () => {
  for (const bad of ["Foo", "a/b", ".."]) {
    const manifest = JSON.stringify({
      docs: [{ path: "x.md", slug: bad, section: "guides", title: "X" }],
    });
    const { deps, writes } = fakeDeps({
      fetchRaw: fetchRawWithManifests({ "w6w-io/w6w-ui": manifest }, async () => "fixture body\n"),
    });

    const result = await runImport(fixtureSources(1), deps);

    assert.notEqual(result.exitCode, 0, `slug ${JSON.stringify(bad)} must fail the run`);
    assert.equal(writes.size, 0);
  }
});

// --- A6: the sink — canonicalize once, never blocklist spellings -------------------------------

test("manifest traversal fixtures never escape docs/ (and never produce a URL containing '..'), and the run fails — while a legitimate sibling entry is still requested (not a wholesale manifest refusal)", async () => {
  const targetRepo = "w6w-io/w6w-ui";
  const fixtures = ["../../../README.md", "/etc/passwd", "docs/../secret.md", "%2e%2e%2fsecret.md"];

  for (const badPath of fixtures) {
    const requestedPaths: string[] = [];
    const manifest = JSON.stringify({
      docs: [
        { path: badPath, slug: "evil", section: "guides", title: "Evil" },
        { path: "embedding.md", slug: "embedding", section: "guides", title: "Embedding" },
      ],
    });

    const deps: ImportDeps = {
      fetchRaw: async (repo, path) => {
        if (path === "docs/manifest.json") return repo === targetRepo ? manifest : EMPTY_MANIFEST;
        requestedPaths.push(path);
        if (repo === targetRepo && path === "docs/embedding.md") return "Legit body\n";
        // A request NOT anchored under docs/ "succeeds" here as if it reached real,
        // out-of-scope, sensitive repo content — a blocklist that lets a raw/unprefixed path
        // through (rather than always constructing the URL from the SAME canonicalized,
        // docs/-anchored value) would happily fetch and import it; the assertions below catch
        // that even though this fixture's raw spelling never contains a literal '..'.
        if (!path.startsWith("docs/")) return "ATTACKER CONTROLLED CONTENT\n";
        throw new Error(`unexpected fetchRaw(${repo}, ${path})`);
      },
      fetchLastCommitDate: async (repo, path) => {
        requestedPaths.push(path);
        if (repo === targetRepo && path === "docs/embedding.md") return "2026-01-01T00:00:00Z";
        if (!path.startsWith("docs/")) return "2020-01-01T00:00:00Z";
        throw new Error(`unexpected fetchLastCommitDate(${repo}, ${path})`);
      },
      readExisting: async () => null,
      writeFile: async (path, bytes) => {
        assert.ok(
          !bytes.includes("ATTACKER CONTROLLED CONTENT"),
          `attacker-controlled content must never be written (path ${path}, badPath ${JSON.stringify(badPath)})`,
        );
      },
      listExisting: async () => [],
      removeFile: async () => {},
    };

    const result = await runImport([], deps);

    assert.notEqual(result.exitCode, 0, `badPath ${JSON.stringify(badPath)} must fail the run`);
    assert.ok(
      requestedPaths.every((p) => p.startsWith("docs/")),
      `every requested path must be anchored under docs/ — got: ${JSON.stringify(requestedPaths)}`,
    );
    assert.ok(
      !requestedPaths.some((p) => p.includes("..")),
      `no requested path may contain '..' — got: ${JSON.stringify(requestedPaths)}`,
    );
    assert.ok(
      requestedPaths.includes("docs/embedding.md"),
      "the legitimate sibling entry must still be requested — a wholesale manifest refusal would never reach it",
    );
  }
});

// --- A7/D-B: pinned ∪ manifest merge, deduplicated by (section, slug) --------------------------

test("a manifest entry re-declaring the SAME (repo, resolved path) as a pinned entry dedups silently", async () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "build-a-w6w-app");
  const manifest = JSON.stringify({
    docs: [
      {
        path: "build-a-w6w-app.md", // resolves to "docs/build-a-w6w-app.md" — same as the pinned entry's path
        slug: "build-a-w6w-app",
        section: "guides",
        title: "Build a w6w app",
      },
    ],
  });
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({ "w6w-io/w6w-core": manifest }, async () => "fixture body\n"),
  });

  const result = await runImport(pinned, deps);

  assert.equal(result.exitCode, 0);
  assert.equal(writes.size, 1, "one write, not two, for the deduplicated (section, slug)");
});

test("a manifest entry claiming the SAME (section, slug) as a pinned entry from a DIFFERENT path fails the run, naming both", async () => {
  const pinned = DOC_SOURCES.filter((s) => s.slug === "ui");
  const manifest = JSON.stringify({
    docs: [{ path: "other.md", slug: "ui", section: "packages", title: "Other" }],
  });
  const { deps, writes } = fakeDeps({
    fetchRaw: fetchRawWithManifests({ "w6w-io/w6w-ui": manifest }, async () => "fixture body\n"),
  });

  const result = await runImport(pinned, deps);

  assert.notEqual(result.exitCode, 0);
  assert.equal(writes.size, 0);
  const failure = result.failures.find((f) => /packages, ui/.test(f.error) || /README\.md/.test(f.error));
  assert.ok(failure, `expected a collision failure naming both sources, got: ${JSON.stringify(result.failures)}`);
  assert.match(failure!.error, /README\.md/);
  assert.match(failure!.error, /docs\/other\.md/);
});

// --- A9: no discovery endpoint ------------------------------------------------------------------

test("runImport fetches docs/manifest.json for every MANIFEST_REPOS entry, and only that path", async () => {
  const requestedManifestPaths: string[] = [];
  const { deps } = fakeDeps({
    fetchRaw: async (repo, path) => {
      if (path === "docs/manifest.json") requestedManifestPaths.push(repo);
      return path === "docs/manifest.json" ? EMPTY_MANIFEST : "fixture body\n";
    },
  });

  await runImport(fixtureSources(1), deps);

  assert.deepEqual([...requestedManifestPaths].sort(), [...MANIFEST_REPOS].sort());
});

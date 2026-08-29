// The docs importer — `pnpm import-docs`. Fetches the PINNED list in `doc-sources.ts`'s
// `DOC_SOURCES` plus every entry each `MANIFEST_REPOS` repo's own `docs/manifest.json` names,
// from public GitHub, tags each with frontmatter (`renderDocFile`), and writes them into the
// `docs` content collection (`content/<section>/<slug>.md` — `content/` is a sibling of `src/`,
// matched by `content.config.ts`'s `*/*.md` pattern, no `docs/` wrapper folder).
//
// HARD-FAIL, NEVER SKIP. `runImport` below gathers all sources first and writes only if every
// one succeeded — a single 404, network error, rate limit, or invalid manifest entry leaves the
// committed catalog untouched and exits non-zero, naming every failure. A 404 from GitHub is
// ambiguous between "this repo went private" and "this path never existed" (GitHub returns 404,
// not 403, for a private repo to an unauthenticated caller) — so a "catch each source's error
// and keep going" importer would make those two cases, and a transient blip, indistinguishable
// in the resulting diff.
//
// PURE CORE / IMPURE SHELL. `runImport` takes its network and filesystem calls as an injected
// `ImportDeps` — fetch, commit-date lookup, existing-file read, and write are parameters, not
// calls to the real `fetch()`/`node:fs` — so this file's whole trust-boundary behaviour is
// unit-testable with fake deps and no real network or disk (`import-docs.test.ts`). `main()`
// below is the only place these are wired to the real implementations.
//
// EXPLICIT PINNING, NEVER FOLDER DISCOVERY. Every file this importer fetches is named either by
// the pinned `DOC_SOURCES` array or by a `docs/manifest.json` committed (and PR-reviewed) in the
// source repo. No code path here lists a GitHub directory, tree or search endpoint — the only
// `api.github.com` path used is `/repos/<repo>/commits?path=…`, and the only raw host is
// `raw.githubusercontent.com` (for both doc bodies AND each repo's `docs/manifest.json`).

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DOC_SOURCES,
  EXCLUDED_REPOS,
  expandManifest,
  MANIFEST_REPOS,
  mergeSources,
  outputPath,
  renderDocFile,
  stripFrontmatter,
} from "./doc-sources.ts";
import type { DocSource } from "./doc-sources.ts";

/**
 * The `docs` collection's source directory, resolved from **this module's own URL**, never
 * `cwd` — this may be invoked via `pnpm import-docs`, a workspace-root delegation, or directly
 * by a human from anywhere. This file lives at `src/lib/import-docs.ts`; `content/` is a
 * sibling of `src/`, so two levels up, not one.
 */
const DOCS_DIR = new URL("../../content/", import.meta.url);

const RAW_BASE = "https://raw.githubusercontent.com";
const API_BASE = "https://api.github.com";
/** All source repos serve `main` as their default branch. */
const REF = "main";

export interface ImportDeps {
  /** Raw file body from `raw.githubusercontent.com` — not the rate-limited REST API. Also used
   *  to fetch a repo's `docs/manifest.json`, which is just another raw file. */
  fetchRaw(repo: string, path: string): Promise<string>;
  /** The file's own last-commit date (ISO), via the REST API's `/commits` endpoint. */
  fetchLastCommitDate(repo: string, path: string): Promise<string>;
  /** The currently-committed bytes at `path` (relative to the docs dir), or `null` if absent. */
  readExisting(path: string): Promise<string | null>;
  writeFile(path: string, bytes: string): Promise<void>;
  /** Every `.md` currently under the collection root, collection-relative. */
  listExisting(): Promise<string[]>;
  /** Remove a collection-relative path. */
  removeFile(path: string): Promise<void>;
}

export interface ImportFailure {
  /** The full `DocSource` when the failure is source-specific. A bare `{ repo }` pointer when
   *  the failure happened before a `DocSource` could be built — a manifest that failed to fetch
   *  or parse, or an entry that failed validation (its repo + index are named in `error`). */
  source: DocSource | { repo: string };
  error: string;
}

export interface ImportResult {
  exitCode: number;
  /** Output paths actually written (bytes changed or the file was new). */
  written: string[];
  /** Output paths whose rendered bytes matched what was already committed. */
  unchanged: string[];
  /** Files under the collection root that the effective source list no longer claims — deleted. */
  removed: string[];
  /** Every failure — a manifest problem or a fetch failure. Non-empty only when `exitCode !== 0`. */
  failures: ImportFailure[];
}

/**
 * Fetch every `MANIFEST_REPOS` repo's `docs/manifest.json`, validate its entries (pure, via
 * `expandManifest`), and return the manifest-derived sources plus any failures. A missing or
 * unparseable manifest is one failure for that repo (write-nothing, not an empty result); one
 * bad entry inside an otherwise-valid manifest fails only that entry, naming the repo + index —
 * its siblings, including a legitimate entry right beside it, are still expanded and still
 * fetched below.
 */
async function gatherManifestSources(
  deps: ImportDeps,
): Promise<{ sources: DocSource[]; failures: ImportFailure[] }> {
  const sources: DocSource[] = [];
  const failures: ImportFailure[] = [];

  for (const repo of MANIFEST_REPOS) {
    let rawJson: string;
    try {
      rawJson = await deps.fetchRaw(repo, "docs/manifest.json");
    } catch (error) {
      failures.push({
        source: { repo },
        error: `${repo}: docs/manifest.json fetch failed: ${(error as Error).message}`,
      });
      continue;
    }

    const expansion = expandManifest(repo, rawJson);
    if ("manifestError" in expansion) {
      failures.push({ source: { repo }, error: expansion.manifestError });
      continue;
    }
    for (const entryFailure of expansion.failures) {
      failures.push({ source: { repo }, error: entryFailure.error });
    }
    sources.push(...expansion.sources);
  }

  return { sources, failures };
}

/**
 * Fetch every source, then write only if every fetch succeeded — two phases, deliberately, so a
 * failure never leaves a stale partial catalog: gather first, write second, and only if
 * gathering produced zero failures across BOTH the manifest step and the per-source fetch step.
 */
export async function runImport(sources: DocSource[], deps: ImportDeps): Promise<ImportResult> {
  const manifest = await gatherManifestSources(deps);
  const merge = mergeSources(sources, manifest.sources);

  const failures: ImportFailure[] = [...manifest.failures];
  for (const collision of merge.collisions) {
    failures.push({
      source: collision.a,
      error:
        `(${collision.section}, ${collision.slug}) claimed by two different sources: ` +
        `${collision.a.repo}/${collision.a.path} and ${collision.b.repo}/${collision.b.path}`,
    });
  }

  const gathered: Array<{ source: DocSource; body: string; lastChanged: string }> = [];
  for (const source of merge.sources) {
    try {
      const [rawBody, lastChanged] = await Promise.all([
        deps.fetchRaw(source.repo, source.path),
        deps.fetchLastCommitDate(source.repo, source.path),
      ]);
      gathered.push({ source, body: stripFrontmatter(rawBody), lastChanged });
    } catch (error) {
      failures.push({ source, error: (error as Error).message });
    }
  }

  if (failures.length > 0) {
    // Write NOTHING — not even the sources that did succeed. See this file's header: a
    // "wrote all but one" run is exactly the ambiguous partial state this importer refuses to
    // produce.
    return { exitCode: 1, written: [], unchanged: [], removed: [], failures };
  }

  const written: string[] = [];
  const unchanged: string[] = [];
  for (const { source, body, lastChanged } of gathered) {
    const path = outputPath(source);
    const next = renderDocFile(source, body, lastChanged);
    const prior = await deps.readExisting(path);
    if (prior === next) {
      unchanged.push(path);
    } else {
      await deps.writeFile(path, next);
      written.push(path);
    }
  }

  /*
   * PRUNE. Everything under the collection root not claimed by the effective source list is
   * removed on the success path only — a stale file left behind by a renamed section or a
   * dropped source would otherwise resolve at two routes with nothing saying which is current.
   * Safe because it runs only after the failure return above, and only removes what the
   * effective list no longer claims.
   */
  const expected = new Set(merge.sources.map(outputPath));
  const removed: string[] = [];
  for (const path of await deps.listExisting()) {
    if (!expected.has(path)) {
      await deps.removeFile(path);
      removed.push(path);
    }
  }

  return { exitCode: 0, written, unchanged, removed, failures: [] };
}

// ---------------------------------------------------------------------------
// The impure shell — real network, real filesystem. Everything above this line is exercised
// with fake deps in `import-docs.test.ts`; everything below is wired together only here.
// ---------------------------------------------------------------------------

function rawUrl(repo: string, path: string): string {
  return `${RAW_BASE}/${repo}/${REF}/${path}`;
}

function commitsUrl(repo: string, path: string): string {
  return `${API_BASE}/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`;
}

/** Not subject to `api.github.com`'s 60/hour unauthenticated quota. Used for both doc bodies
 *  and each repo's `docs/manifest.json`. */
async function fetchRaw(repo: string, path: string): Promise<string> {
  const url = rawUrl(repo, path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

/**
 * One REST call per file — the only calls subject to the 60/hour unauthenticated quota. Sends
 * `Authorization: Bearer ${GITHUB_TOKEN}` when set (CI injects it automatically — no new secret)
 * and works without it locally.
 */
async function fetchLastCommitDate(repo: string, path: string): Promise<string> {
  const url = commitsUrl(repo, path);
  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`GET ${url} returned no commits for ${repo}/${path}`);
  }
  const first = payload[0] as { commit?: { committer?: { date?: unknown } } };
  const date = first.commit?.committer?.date;
  if (typeof date !== "string") {
    throw new Error(`GET ${url}'s first commit result has no commit.committer.date`);
  }
  return date;
}

async function readExisting(path: string): Promise<string | null> {
  try {
    return await readFile(new URL(path, DOCS_DIR), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeOutput(path: string, bytes: string): Promise<void> {
  const file = new URL(path, DOCS_DIR);
  await mkdir(new URL(".", file), { recursive: true });
  await writeFile(file, bytes);
}

/**
 * Every `.md` matching `outputPath`'s own shape (`<section>/<slug>.md`, exactly one directory
 * level under the collection root) — collection-relative. `DOCS_DIR` is `content/`, shared with
 * the `siteDocs` collection's root-level files (`content/index.md`, `content/quickstart.md`,
 * `content.config.ts`'s `*.md` pattern) — a bare filename with no `/` is filtered out here for
 * exactly the reason `content.config.ts`'s own comment gives: those two patterns are disjoint by
 * shape, and this is the half of that disjointness the importer itself is responsible for. Without
 * the filter, `listExisting` would report `index.md`/`quickstart.md` as "existing under the
 * collection root", the prune step below would find them unclaimed by any `DocSource`, and a
 * routine `pnpm import-docs` run would delete the site's own hand-authored pages.
 */
async function listExisting(): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(new URL(".", DOCS_DIR), { withFileTypes: true, recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const root = new URL(".", DOCS_DIR).pathname.replace(/\/$/, "");
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    // `parentPath` is Node 20.12+/22+; `path` is its deprecated predecessor. Neither is in
    // this TS lib's Dirent, so read them off a narrowed shape rather than widening to any.
    const dir = e as unknown as { parentPath?: string; path?: string };
    // Node's `readdir(..., { recursive: true })` reports `parentPath` WITH a trailing slash
    // for entries directly in the base directory (matching the trailing-slash URL passed to
    // it) but WITHOUT one for subdirectory entries — collapse both shapes before joining, or
    // a base-directory file leaves a stray leading "/" after the slice below and silently
    // passes the "is this nested" check it exists to enforce.
    const parent = (dir.parentPath ?? dir.path ?? "").replace(/\/$/, "");
    const relative = `${parent}/${e.name}`.slice(root.length + 1);
    if (!relative.includes("/")) continue; // root-level `siteDocs` file — not this collection's.
    out.push(relative);
  }
  return out;
}

async function removeFile(path: string): Promise<void> {
  await rm(new URL(path, DOCS_DIR), { force: true });
}

async function main(): Promise<number> {
  const result = await runImport(DOC_SOURCES, {
    fetchRaw,
    fetchLastCommitDate,
    readExisting,
    writeFile: writeOutput,
    listExisting,
    removeFile,
  });

  if (result.exitCode !== 0) {
    console.error(
      `import-docs: ${result.failures.length} failure(s) — wrote NOTHING (a partial write ` +
        "would be indistinguishable from a real deletion):",
    );
    for (const failure of result.failures) {
      console.error(`  - ${failure.source.repo}: ${failure.error}`);
    }
    return 1;
  }

  console.log(
    `import-docs: -> ${fileURLToPath(DOCS_DIR)} ` +
      `(${result.written.length} written, ${result.unchanged.length} unchanged, ` +
      `${result.removed.length} removed). ` +
      `Excluded (not fetchable from public GitHub today, see EXCLUDED_REPOS): ` +
      `${EXCLUDED_REPOS.join(", ")}.`,
  );
  return 0;
}

// Guarded, not a bare top-level call: `import-docs.test.ts` `import()`s this module directly to
// reach `runImport` with fake deps, and an unguarded call here would hit the real network — and,
// on a failure, exit the whole test process — on every such import.
const isMainModule = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(`import-docs: FAILED — ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

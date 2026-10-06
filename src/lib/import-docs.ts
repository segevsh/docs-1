// The docs importer — `pnpm import-docs`. Collects every page this site publishes from the LOCAL
// monorepo checkout: every entry of every
// `docs/manifest.json` found by walking the source root (the monorepo's `packages/` by default).
// Each page is stamped with provenance frontmatter (`renderDocFile`) and written into the `docs`
// content collection (`content/<section>/<slug>.md`, a sub-page at
// `content/<section>/<parent>/<child>.md` — `content/` is a sibling of `src/`, matched by
// `content.config.ts`'s `*/**/*.md` pattern). CI never runs this: a human runs it locally and
// commits `content/`, so the committed diff IS the review of what gets published.
//
// DISCOVERY, GATED BY THE MANIFEST. The walk finds every `docs/manifest.json` under the root,
// never descending into `node_modules`, `dist`, `build`, any dot-directory, or any directory
// holding a `.docsignore` file (that directory and everything under it). Only files a manifest
// LISTS are read — a file sitting in a `docs/` folder is never published on presence alone.
// Because this reads the checkout rather than public GitHub, a private repo's listed docs are
// publishable too: the manifest, not repo visibility, is the gate.
//
// HARD-FAIL, NEVER SKIP. `runImport` below gathers all sources first and writes only if every one
// succeeded — a missing file, an invalid manifest entry, a path-traversal attempt, a
// `(section, slug)` collision, an orphaned sub-page, frontmatter that disagrees with its manifest
// entry, or a listed file with UNCOMMITTED changes (`--allow-dirty` overrides that last one) leaves
// the committed catalog untouched and exits non-zero, naming every failure. A "catch each
// source's error and keep going" importer would make a typo'd path indistinguishable from a
// deliberate removal in the resulting diff. The one deliberate skip is a page whose own
// frontmatter says `shared: false` — a draft — and it is reported, not silent.
//
// PURE CORE / IMPURE SHELL. `runImport` takes its filesystem and git calls as an injected
// `ImportDeps` — directory listing, file reads, git lookups, existing-file read, write and remove
// are parameters, not calls to the real `node:fs`/`git` — so this file's whole trust-boundary
// behaviour is unit-testable with fake deps and no real disk or git (`import-docs.test.ts`).
// `main()` below is the only place these are wired to the real implementations.

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  checkSourceMeta,
  DOCSIGNORE,
  expandManifest,
  isSkippedDirName,
  mergeSources,
  orphanedSubPages,
  outputPath,
  parseFrontmatter,
  parseRepoSlug,
  renderDocFile,
} from "./doc-sources.ts";
import type { DocSource, Provenance, SourceMeta } from "./doc-sources.ts";

/**
 * The `docs` collection's source directory, resolved from **this module's own URL**, never
 * `cwd` — this may be invoked via `pnpm import-docs`, a workspace-root delegation, or directly
 * by a human from anywhere. This file lives at `src/lib/import-docs.ts`; `content/` is a
 * sibling of `src/`, so two levels up, not one.
 */
const DOCS_DIR = new URL("../../content/", import.meta.url);

/** The default source root: the directory this package sits in — the monorepo's `packages/`
 *  when run from `packages/docs`. A git worktree of this repo lives elsewhere, so `--root` /
 *  `DOCS_SOURCE_ROOT` override it. */
const DEFAULT_SOURCE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface DirEntry {
  name: string;
  /** A symlink is `"other"` — discovery never follows one. */
  kind: "dir" | "file" | "other";
}

export interface ImportDeps {
  /** List one directory (absolute path). */
  readDir(dir: string): Promise<DirEntry[]>;
  /** A manifest's or source file's text (absolute path). Throws when the file is absent. */
  readText(file: string): Promise<string>;
  /** `git rev-parse --show-toplevel` for the repo enclosing `dir` — absolute. */
  gitToplevel(dir: string): Promise<string>;
  /** `git remote get-url <remote>`, or `null` when the repo has no such remote. */
  gitRemoteUrl(repoRoot: string, remote: string): Promise<string | null>;
  /** `git rev-parse HEAD`. */
  gitHeadSha(repoRoot: string): Promise<string>;
  /** `git hash-object <file>` — the blob hash of the working-tree bytes. */
  gitBlobSha(file: string): Promise<string>;
  /** `git log -1 --format=%cI -- <path>` (repo-relative), or `null` when never committed. */
  gitLastCommitDate(repoRoot: string, path: string): Promise<string | null>;
  /** `git status --porcelain -- <path>` (repo-relative) is non-empty. */
  gitIsDirty(repoRoot: string, path: string): Promise<boolean>;
  /** The currently-committed bytes at `path` (relative to the docs dir), or `null` if absent. */
  readExisting(path: string): Promise<string | null>;
  writeFile(path: string, bytes: string): Promise<void>;
  /** Every `.md` currently under the collection root at least one directory deep,
   *  collection-relative. */
  listExisting(): Promise<string[]>;
  /** Remove a collection-relative path (and any directory it leaves empty). */
  removeFile(path: string): Promise<void>;
}

export interface ImportOptions {
  /** Absolute path the walk starts from, and every `DocSource.file` is relative to. */
  root: string;
  /** Report what would be written and pruned; write and remove nothing. */
  dryRun?: boolean;
  /** Collect a listed file even when it has uncommitted changes (reported in `dirty`). */
  allowDirty?: boolean;
}

export interface ImportFailure {
  /** Root-relative path of what failed — a manifest, a directory, or a source file. */
  at: string;
  error: string;
}

export interface ImportResult {
  exitCode: number;
  dryRun: boolean;
  /** Every `docs/manifest.json` discovery found, root-relative. */
  manifests: string[];
  /** Every directory skipped because it holds a `.docsignore`, root-relative. */
  ignored: string[];
  /** Listed sources skipped because their frontmatter says `shared: false`, root-relative. */
  skipped: string[];
  /** Sources collected despite uncommitted changes (only ever non-empty with `allowDirty`). */
  dirty: string[];
  /** Output paths written — or, on a dry run, that would be (bytes changed or file new). */
  written: string[];
  /** Output paths whose rendered bytes matched what was already committed. */
  unchanged: string[];
  /** Files under the collection root the effective source list no longer claims — deleted (or,
   *  on a dry run, that would be). */
  removed: string[];
  /** Every failure. Non-empty only when `exitCode !== 0`. */
  failures: ImportFailure[];
}

const MANIFEST = "manifest.json";

/**
 * Walk the source root for every `docs/manifest.json`. Children are visited in name order so the
 * effective source list — and therefore every rendered byte — is the same on every machine. A
 * directory that can't be listed is a failure, not a silently smaller catalog.
 */
async function discoverManifests(
  root: string,
  deps: ImportDeps,
): Promise<{ manifests: string[]; ignored: string[]; failures: ImportFailure[] }> {
  const manifests: string[] = [];
  const ignored: string[] = [];
  const failures: ImportFailure[] = [];

  async function walk(rel: string): Promise<void> {
    let entries: DirEntry[];
    try {
      entries = await deps.readDir(rel === "" ? root : posix.join(root, rel));
    } catch (error) {
      failures.push({ at: rel || ".", error: `cannot list directory: ${(error as Error).message}` });
      return;
    }
    if (entries.some((e) => e.kind === "file" && e.name === DOCSIGNORE)) {
      ignored.push(rel || ".");
      return;
    }
    if (posix.basename(rel) === "docs" && entries.some((e) => e.kind === "file" && e.name === MANIFEST)) {
      manifests.push(`${rel}/${MANIFEST}`);
    }
    const dirs = entries
      .filter((e) => e.kind === "dir" && !isSkippedDirName(e.name))
      .map((e) => e.name)
      .sort();
    for (const name of dirs) await walk(rel === "" ? name : `${rel}/${name}`);
  }

  await walk("");
  return { manifests, ignored, failures };
}

/**
 * Read and validate every discovered manifest (pure validation via `expandManifest`). An
 * unreadable or unparseable manifest is one failure (write-nothing, not an empty result); one bad
 * entry inside an otherwise-valid manifest fails only that entry, naming the manifest + index —
 * its siblings, including a legitimate entry right beside it, are still expanded and still read.
 */
async function gatherManifestSources(
  root: string,
  manifests: string[],
  deps: ImportDeps,
): Promise<{ sources: DocSource[]; failures: ImportFailure[] }> {
  const sources: DocSource[] = [];
  const failures: ImportFailure[] = [];

  for (const manifest of manifests) {
    let rawJson: string;
    try {
      rawJson = await deps.readText(posix.join(root, manifest));
    } catch (error) {
      failures.push({ at: manifest, error: `read failed: ${(error as Error).message}` });
      continue;
    }
    const expansion = expandManifest(manifest, rawJson);
    if ("manifestError" in expansion) {
      failures.push({ at: manifest, error: expansion.manifestError });
      continue;
    }
    for (const entryFailure of expansion.failures) {
      failures.push({ at: manifest, error: entryFailure.error });
    }
    sources.push(...expansion.sources);
  }

  return { sources, failures };
}

interface RepoInfo {
  root: string;
  slug: string;
  headSha: string;
}

/**
 * Discover, read, check and stamp every source, then write only if all of it succeeded — two
 * phases, deliberately, so a failure never leaves a stale partial catalog: gather first, write
 * second, and only if gathering produced zero failures.
 */
export async function runImport(
  pinned: DocSource[],
  deps: ImportDeps,
  options: ImportOptions,
): Promise<ImportResult> {
  const { root, dryRun = false, allowDirty = false } = options;
  const discovery = await discoverManifests(root, deps);
  const manifest = await gatherManifestSources(root, discovery.manifests, deps);
  const merge = mergeSources([...pinned, ...manifest.sources]);

  const failures: ImportFailure[] = [...discovery.failures, ...manifest.failures];
  for (const collision of merge.collisions) {
    failures.push({
      at: collision.b.file,
      error:
        `(${collision.section}, ${collision.slug}) claimed by two different sources: ` +
        `${collision.a.file} and ${collision.b.file}`,
    });
  }

  // One identity lookup per repo, however many of its files are collected.
  const repos = new Map<string, Promise<RepoInfo>>();
  function repoFor(repoRoot: string): Promise<RepoInfo> {
    let info = repos.get(repoRoot);
    if (!info) {
      info = (async () => {
        const url = (await deps.gitRemoteUrl(repoRoot, "upstream")) ??
          (await deps.gitRemoteUrl(repoRoot, "origin"));
        const slug = url === null ? null : parseRepoSlug(url);
        if (slug === null) {
          throw new Error(`repo ${repoRoot} has no upstream or origin remote naming owner/name`);
        }
        return { root: repoRoot, slug, headSha: await deps.gitHeadSha(repoRoot) };
      })();
      repos.set(repoRoot, info);
    }
    return info;
  }

  const skipped: string[] = [];
  const dirty: string[] = [];
  const gathered: Array<{ source: DocSource; meta: SourceMeta; provenance: Provenance; body: string }> =
    [];
  for (const source of merge.sources) {
    const file = posix.join(root, source.file);
    try {
      const text = await deps.readText(file);
      const parsed = parseFrontmatter(text);
      const meta = checkSourceMeta(source, parsed?.fields ?? null);
      if ("errors" in meta) {
        for (const error of meta.errors) failures.push({ at: source.file, error });
        continue;
      }
      if (!meta.shared) {
        skipped.push(source.file);
        continue;
      }

      const repo = await repoFor(await deps.gitToplevel(posix.dirname(file)));
      const sourcePath = posix.relative(repo.root, file);
      if (await deps.gitIsDirty(repo.root, sourcePath)) {
        if (!allowDirty) {
          failures.push({
            at: source.file,
            error: `uncommitted changes in ${repo.slug}:${sourcePath} — commit them, or pass --allow-dirty`,
          });
          continue;
        }
        dirty.push(source.file);
      }
      // A never-committed file can only get here under --allow-dirty (it is untracked, so
      // dirty): date it by the repo's latest commit rather than inventing a clock reading.
      const syncedAt = (await deps.gitLastCommitDate(repo.root, sourcePath)) ??
        (allowDirty ? await deps.gitLastCommitDate(repo.root, ".") : null);
      if (syncedAt === null) throw new Error(`${repo.slug}:${sourcePath} has no commit`);

      gathered.push({
        source,
        meta,
        provenance: {
          sourceRepo: repo.slug,
          sourcePath,
          sourceSha: await deps.gitBlobSha(file),
          sourceRefSha: repo.headSha,
          syncedAt,
        },
        body: parsed?.body ?? text,
      });
    } catch (error) {
      failures.push({ at: source.file, error: (error as Error).message });
    }
  }

  for (const orphan of orphanedSubPages(gathered.map((g) => g.source))) {
    failures.push({
      at: orphan.file,
      error:
        `sub-page (${orphan.section}, ${orphan.slug}) has no published parent ` +
        `(${orphan.section}, ${orphan.slug.split("/")[0]})`,
    });
  }

  const base = { dryRun, manifests: discovery.manifests, ignored: discovery.ignored, skipped, dirty };
  if (failures.length > 0) {
    // Write NOTHING — not even the sources that did succeed. See this file's header: a
    // "wrote all but one" run is exactly the ambiguous partial state this importer refuses to
    // produce.
    return { ...base, exitCode: 1, written: [], unchanged: [], removed: [], failures };
  }

  const written: string[] = [];
  const unchanged: string[] = [];
  for (const { source, meta, provenance, body } of gathered) {
    const path = outputPath(source);
    const next = renderDocFile(source, meta, provenance, body);
    const prior = await deps.readExisting(path);
    if (prior === next) {
      unchanged.push(path);
    } else {
      if (!dryRun) await deps.writeFile(path, next);
      written.push(path);
    }
  }

  /*
   * PRUNE. Everything under the collection root not claimed by a published source is removed on
   * the success path only — a stale file left behind by a renamed section, a dropped source or a
   * page turned back into a draft would otherwise resolve at a route with nothing saying it is no
   * longer current. Safe because it runs only after the failure return above.
   */
  const expected = new Set(gathered.map((g) => outputPath(g.source)));
  const removed: string[] = [];
  for (const path of await deps.listExisting()) {
    if (!expected.has(path)) {
      if (!dryRun) await deps.removeFile(path);
      removed.push(path);
    }
  }

  return { ...base, exitCode: 0, written, unchanged, removed, failures: [] };
}

// ---------------------------------------------------------------------------
// The impure shell — real filesystem, real git. Everything above this line is exercised with
// fake deps in `import-docs.test.ts`; everything below is wired together only here.
// ---------------------------------------------------------------------------

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", cwd, ...args]);
  return stdout.trim();
}

async function readDirEntries(dir: string): Promise<DirEntry[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    kind: e.isDirectory() ? "dir" : e.isFile() ? "file" : "other",
  }));
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
 * Every `.md` at least one directory level under the collection root (`<section>/<slug>.md` and
 * `<section>/<parent>/<child>.md`) — collection-relative. `DOCS_DIR` is `content/`, shared with
 * the `siteDocs` collection's root-level files (`content/index.md`, `content/quickstart.md`,
 * `content.config.ts`'s `*.md` pattern) — a bare filename with no `/` is filtered out here for
 * exactly the reason `content.config.ts`'s own comment gives: those two patterns are disjoint by
 * shape, and this is the half of that disjointness the importer itself is responsible for. Without
 * the filter, `listExisting` would report `index.md`/`quickstart.md` as "existing under the
 * collection root", the prune step would find them unclaimed by any `DocSource`, and a routine
 * `pnpm import-docs` run would delete the site's own hand-authored pages.
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
  return out.sort();
}

/** Remove one collection file, then every directory between it and the collection root that the
 *  removal left empty — a pruned section or parent must not leave a bare folder behind. */
async function removeFile(path: string): Promise<void> {
  await rm(new URL(path, DOCS_DIR), { force: true });
  const segments = path.split("/").slice(0, -1);
  while (segments.length > 0) {
    try {
      await rmdir(new URL(`${segments.join("/")}/`, DOCS_DIR));
    } catch {
      return; // Not empty (or already gone) — nothing further up can be empty either.
    }
    segments.pop();
  }
}

const REAL_DEPS: ImportDeps = {
  readDir: readDirEntries,
  readText: (file) => readFile(file, "utf8"),
  gitToplevel: (dir) => git(dir, ["rev-parse", "--show-toplevel"]),
  gitRemoteUrl: (repoRoot, remote) =>
    git(repoRoot, ["remote", "get-url", remote]).then((url) => url || null, () => null),
  gitHeadSha: (repoRoot) => git(repoRoot, ["rev-parse", "HEAD"]),
  gitBlobSha: (file) => git(posix.dirname(file), ["hash-object", file]),
  gitLastCommitDate: (repoRoot, path) =>
    git(repoRoot, ["log", "-1", "--format=%cI", "--", path]).then((date) => date || null),
  gitIsDirty: (repoRoot, path) =>
    git(repoRoot, ["status", "--porcelain", "--", path]).then((out) => out !== ""),
  readExisting,
  writeFile: writeOutput,
  listExisting,
  removeFile,
};

const USAGE = "usage: pnpm import-docs [--root <dir>] [--dry-run] [--allow-dirty]";

function parseArgs(argv: string[]): ImportOptions {
  let root = process.env.DOCS_SOURCE_ROOT || DEFAULT_SOURCE_ROOT;
  let dryRun = false;
  let allowDirty = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--allow-dirty") allowDirty = true;
    else if (arg === "--root" && argv[i + 1] !== undefined) root = argv[++i];
    else if (arg.startsWith("--root=")) root = arg.slice("--root=".length);
    else if (arg === "--") continue; // pnpm forwards a bare `--` separator verbatim.
    else throw new Error(`unknown argument ${JSON.stringify(arg)}\n${USAGE}`);
  }
  return { root: resolve(root), dryRun, allowDirty };
}

function list(label: string, items: string[]): void {
  console.log(`  ${label} (${items.length})${items.length > 0 ? ":" : ""}`);
  for (const item of items) console.log(`    ${item}`);
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const result = await runImport([], REAL_DEPS, options);

  console.log(`import-docs: source root ${options.root}${result.dryRun ? " (dry run)" : ""}`);
  list("manifests found", result.manifests);
  list("ignored (.docsignore)", result.ignored);
  list("skipped (shared: false)", result.skipped);
  if (result.dirty.length > 0) list("collected WITH uncommitted changes (--allow-dirty)", result.dirty);

  if (result.exitCode !== 0) {
    console.error(
      `import-docs: ${result.failures.length} failure(s) — wrote NOTHING (a partial write ` +
        "would be indistinguishable from a real deletion):",
    );
    for (const failure of result.failures) console.error(`  - ${failure.at}: ${failure.error}`);
    return 1;
  }

  const verb = result.dryRun ? "would write" : "written";
  list(verb, result.written);
  list(result.dryRun ? "would remove" : "removed", result.removed);
  console.log(
    `import-docs: -> ${fileURLToPath(DOCS_DIR)} ` +
      `(${result.written.length} ${verb}, ${result.unchanged.length} unchanged, ` +
      `${result.removed.length} ${result.dryRun ? "would be removed" : "removed"}).`,
  );
  return 0;
}

// Guarded, not a bare top-level call: `import-docs.test.ts` `import()`s this module directly to
// reach `runImport` with fake deps, and an unguarded call here would touch the real disk and
// git — and, on a failure, exit the whole test process — on every such import.
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

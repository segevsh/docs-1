// The pure core of the docs importer: the pinned source list, discovery's skip rules, manifest-
// entry validation, frontmatter parsing/checking, the output-path scheme and rendering. No
// filesystem, no git, no clock — `import-docs.ts` is the impure shell that walks/reads/writes
// around this.
//
// Ported from `packages/frontend/packages/app-pages/src/docs-sources.ts` (T3.1.2 contract,
// building-blocks.md#T-3) — same pure-core/impure-shell split. Do NOT extract a shared `@w6w/*`
// package with that file (binding, contract's Context notes): this module is an independent port,
// not a shared dependency.
//
// ONE SOURCE KIND. Every source is DISCOVERED: the importer walks the local monorepo checkout
// for every `docs/manifest.json` (skipping `SKIPPED_DIR_NAMES`, dot-directories, and any
// directory holding a `.docsignore` file), and `expandManifest` below turns each into sources.
// The manifest is the only publish gate — a file that no manifest lists is never read. There is no
// pinned source list: a manifest may name files outside its `docs/` folder only through its
// declared `roots` (`resolveManifestPath`). The `section` of an entry is checked against the
// closed `SECTIONS` list — the site owns the taxonomy, repos only choose which page lands where.
// The one generated page (`reference-api/http-api`) comes from `api-reference.ts`, not a manifest.
//
// `syncedAt` (rendered by `renderDocFile` below) is the source file's own last-COMMIT date, never
// an in-body revision header — these are two different, legitimately-disagreeing dates.
// `import-docs.ts` asks git for it per file; this module only renders whatever string it is handed.

import { posix } from "node:path";

/**
 * The closed section list, in rail order — the site-owned taxonomy. A manifest entry whose
 * `section` is not one of these fails the import. `reference-*` are the three sub-groups of the
 * rail's collapsed Reference area.
 */
export const SECTIONS = [
  "get-started",
  "guides",
  "clients",
  "self-hosting",
  "build-apps",
  "reference-spec",
  "reference-api",
  "reference-packages",
] as const;

export type Section = (typeof SECTIONS)[number];

/**
 * Repos (package dir names — the first segment of `DocSource.file`, never the remote slug) whose
 * source must not be linked to from a public page: a relative link from a collected page into an
 * uncollected file of one of these fails the import instead of becoming a GitHub URL (D-6).
 */
export const PRIVATE_REPOS: readonly string[] = ["server", "studio", "control", "admin"];

export interface DocSource {
  /** Path of the file under the source root (the monorepo's `packages/`), posix, no leading
   *  slash — e.g. "core/rfcs/workflow.md" or "studio/docs/workflows/triggers.md". For a
   *  manifest-derived source this is always built from the CANONICALIZED manifest path (see
   *  `resolveManifestPath`), never the raw manifest field. */
  file: string;
  /** One of `SECTIONS` for every manifest-derived source (validated by `expandManifest`). */
  section: string;
  /** One segment (`workflows`) or two (`workflows/triggers`, a sub-page of `workflows`) —
   *  becomes `<section>/<slug>.md` (see `outputPath`). */
  slug: string;
  /** Page heading, and the rail's link label for this entry. */
  title: string;
  /** Explicit nav position within its level; `null` sorts after every ordered sibling. */
  order: number | null;
  /** Index of this entry in its manifest's `docs` array — the rail's tie-break, so unordered
   *  entries keep their declared order. */
  position: number;
  /** One reader-facing line for the section landing page, from the manifest's optional `summary`;
   *  `null` when absent. */
  summary: string | null;
  /** Where the file lives: under the manifest's `docs/` (frontmatter mandatory) or under one of
   *  its declared `roots` (a README, an RFC — frontmatter optional). */
  origin: "docs" | "root";
}

/** Directory names discovery never descends into, on top of every dot-directory (`.git`,
 *  `.worktrees`, `.astro`, …) and every directory holding a `.docsignore` file. */
export const SKIPPED_DIR_NAMES: readonly string[] = ["node_modules", "dist", "build"];

/** A directory holding a file of this name is skipped by discovery, along with everything under
 *  it. Presence is the signal — the file's content is free-form (conventionally a one-line
 *  reason). */
export const DOCSIGNORE = ".docsignore";

/** True when discovery must not descend into a directory of this name (regardless of content). */
export function isSkippedDirName(name: string): boolean {
  return name.startsWith(".") || SKIPPED_DIR_NAMES.includes(name);
}

/** A manifest entry's `section` and every `slug` segment must be lowercase, hyphenated,
 *  filename-safe — never a raw manifest string used as-is anywhere a path or route is built. */
const SEGMENT_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * One segment, or two joined by `/` (a sub-page). `index` is refused as a segment: Astro's glob
 * loader drops a trailing `/index` when it builds an entry's id, so `<section>/index.md` would
 * silently become the id `<section>` and collide with nothing the importer can see.
 */
function validSlug(slug: string): boolean {
  const segments = slug.split("/");
  if (segments.length < 1 || segments.length > 2) return false;
  return segments.every((s) => SEGMENT_RE.test(s) && s !== "index");
}

/** The parent slug of a sub-page (`workflows/triggers` → `workflows`), or `null` at top level. */
export function parentSlug(slug: string): string | null {
  const i = slug.indexOf("/");
  return i === -1 ? null : slug.slice(0, i);
}

/**
 * The ONE normalization every subsequent use of a manifest entry's `path` reads from — the file
 * read, the git lookups, and the `DocSource.file` stored on the record all use this function's
 * return value, never the raw manifest field (canonicalize once, at the sink, rather than
 * blocklisting spellings like `..`/`%2e%2e`/a leading `/`/a backslash).
 *
 * The path is anchored at `docs/` and normalized (`../rfcs/app.md` → `rfcs/app.md`). It resolves
 * iff the result lies under `docs/`, or equals / lies under one of the (already canonical)
 * `roots`. Anything else — a `..` that cannot be cancelled out, or a sibling directory the manifest
 * never declared — is `null`. A concatenation that merely lands somewhere *inside* an allowed tree
 * without corresponding to a real file (a leading `/`, a percent-encoded spelling that never
 * becomes a literal `..`) is NOT rejected here — it is refused naturally when the (nonexistent)
 * resolved path fails to read, which is exactly as safe and needs no second blocklist.
 */
function resolveManifestPath(rawPath: string, roots: readonly string[] = []): string | null {
  const resolved = posix.normalize(`docs/${rawPath}`);
  if (resolved === "docs/" || resolved === "docs" || resolved === ".") return null;
  if (resolved.split("/").includes("..")) return null;
  if (resolved.startsWith("docs/")) return resolved;
  if (roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) return resolved;
  return null;
}

/**
 * One `roots` item, canonicalized — or `null` when it is not a safe repo-relative directory/file:
 * not a string, absolute, containing a backslash, escaping via `..`, empty / `.`, or `docs` /
 * under `docs/` (that tree is already the manifest's own, with the stricter frontmatter rule).
 */
function canonicalRoot(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "" || raw.startsWith("/") || raw.includes("\\")) return null;
  const root = posix.normalize(raw).replace(/\/+$/, "");
  if (root === "" || root === "." || root.split("/").includes("..")) return null;
  if (root === "docs" || root.startsWith("docs/")) return null;
  return root;
}

export interface ManifestEntryFailure {
  /** Index into the manifest's `docs` array. */
  index: number;
  error: string;
}

export interface ManifestExpansion {
  /** Successfully-validated entries, ready to merge into the effective source list. */
  sources: DocSource[];
  /** Per-entry validation failures — one bad entry does not invalidate its siblings. */
  failures: ManifestEntryFailure[];
}

/** The whole manifest failed to parse as `{ "roots"?: [...], "docs": [...] }` — distinct from a
 *  single bad entry: nothing in the manifest can be trusted, so nothing is expanded. */
export interface ManifestParseFailure {
  manifestError: string;
}

const MANIFEST_KEYS: readonly string[] = ["roots", "docs"];
const MANIFEST_REQUIRED_ENTRY_KEYS = ["path", "slug", "section", "title"] as const;
/** Every key an entry may carry; any other fails the entry (a typo'd `sumary` must not vanish). */
const MANIFEST_ENTRY_KEYS: readonly string[] = [...MANIFEST_REQUIRED_ENTRY_KEYS, "order", "summary"];

/**
 * Parses and validates one discovered `docs/manifest.json` body. Pure — takes the manifest's own
 * path under the source root (e.g. `"studio/docs/manifest.json"`) and its raw JSON text, returns
 * either a manifest-level parse failure or a per-entry expansion. `import-docs.ts`'s shell does
 * the actual discovery and read.
 */
export function expandManifest(
  manifestFile: string,
  rawJson: string,
): ManifestExpansion | ManifestParseFailure {
  // The directory the `docs/` folder sits in — every resolved `path` is anchored under it.
  const packageDir = posix.dirname(posix.dirname(manifestFile));
  const where = manifestFile;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    return { manifestError: `${where}: not valid JSON (${(error as Error).message})` };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { docs?: unknown }).docs)
  ) {
    return { manifestError: `${where}: missing a "docs" array` };
  }
  for (const key of Object.keys(parsed as object)) {
    if (!MANIFEST_KEYS.includes(key)) {
      return { manifestError: `${where}: unknown top-level key "${key}" (allowed: roots, docs)` };
    }
  }
  const rawRoots = (parsed as { roots?: unknown }).roots ?? [];
  if (!Array.isArray(rawRoots)) return { manifestError: `${where}: "roots" must be an array` };
  const roots: string[] = [];
  for (const raw of rawRoots) {
    const root = canonicalRoot(raw);
    if (root === null) {
      return {
        manifestError: `${where}: invalid root ${JSON.stringify(raw)} — a roots item must be a ` +
          `repo-relative path: no "..", not absolute, not "docs" or under it`,
      };
    }
    roots.push(root);
  }

  const entries = (parsed as { docs: unknown[] }).docs;
  const sources: DocSource[] = [];
  const failures: ManifestEntryFailure[] = [];

  entries.forEach((raw, index) => {
    const fail = (error: string) => failures.push({ index, error: `${where} entry ${index}: ${error}` });
    if (typeof raw !== "object" || raw === null) return fail("not an object");
    const entry = raw as Record<string, unknown>;
    for (const key of Object.keys(entry)) {
      if (!MANIFEST_ENTRY_KEYS.includes(key)) {
        return fail(`unknown key "${key}" (allowed: ${MANIFEST_ENTRY_KEYS.join(", ")})`);
      }
    }
    for (const key of MANIFEST_REQUIRED_ENTRY_KEYS) {
      if (typeof entry[key] !== "string") return fail(`"${key}" is missing or not a string`);
    }
    const path = entry.path as string;
    const slug = entry.slug as string;
    const section = entry.section as string;
    const title = entry.title as string;
    const order = entry.order ?? null;
    const summary = entry.summary ?? null;
    if ("summary" in entry && typeof entry.summary !== "string") {
      return fail(`"summary" must be a string`);
    }

    const resolved = resolveManifestPath(path, roots);
    if (resolved === null) return fail(`path "${path}" escapes docs/ and every declared root`);
    if (!validSlug(slug)) {
      return fail(
        `slug "${slug}" must be one or two "/"-joined segments, each matching ${SEGMENT_RE} ` +
          `and not "index"`,
      );
    }
    if (!(SECTIONS as readonly string[]).includes(section)) {
      return fail(`section "${section}" is not one of: ${SECTIONS.join(", ")}`);
    }
    if (order !== null && !Number.isInteger(order)) return fail(`"order" must be an integer`);

    sources.push({
      file: packageDir === "." ? resolved : `${packageDir}/${resolved}`,
      slug,
      section,
      title,
      order: order as number | null,
      position: index,
      summary: summary as string | null,
      origin: resolved.startsWith("docs/") ? "docs" : "root",
    });
  });

  return { sources, failures };
}

export interface SourceCollision {
  section: string;
  slug: string;
  a: DocSource;
  b: DocSource;
}

export interface MergeResult {
  /** The effective source list, deduplicated by `(section, slug)`. */
  sources: DocSource[];
  /** Two DIFFERENT files resolving to the same `(section, slug)` — a hard-fail. */
  collisions: SourceCollision[];
}

/**
 * The effective source list, deduplicated by `(section, slug)`. Two entries sharing that key from
 * the SAME file collapse to one silently — the LATER entry wins; from a DIFFERENT file it is a
 * collision that must abort the whole run — `outputPath` uniqueness is the invariant this protects.
 */
export function mergeSources(all: DocSource[]): MergeResult {
  const bySlug = new Map<string, DocSource>();
  const collisions: SourceCollision[] = [];

  for (const source of all) {
    const key = `${source.section}/${source.slug}`;
    const existing = bySlug.get(key);
    if (!existing || existing.file === source.file) {
      bySlug.set(key, source);
    } else {
      collisions.push({ section: source.section, slug: source.slug, a: existing, b: source });
    }
  }

  return { sources: [...bySlug.values()], collisions };
}

/**
 * Every sub-page whose parent (`<section>/<first segment>`) is not among `sources` — one level of
 * nesting only, and the parent must be a real, published page in the SAME section. Run over the
 * published set (after `shared: false` drafts are dropped), so a draft parent orphans its
 * children loudly rather than leaving them under a heading that links nowhere.
 */
export function orphanedSubPages(sources: DocSource[]): DocSource[] {
  const present = new Set(sources.map((s) => `${s.section}/${s.slug}`));
  return sources.filter((s) => {
    const parent = parentSlug(s.slug);
    return parent !== null && !present.has(`${s.section}/${parent}`);
  });
}

/**
 * Where one source's rendered file lands, relative to the `docs` collection's base
 * (`src/content.config.ts`'s `glob({ pattern: "*\/**\/*.md", base: "./content" })`).
 * `<section>/<slug>.md`, so a sub-page lands at `<section>/<parent>/<child>.md` — unique by
 * construction across the pinned list, and `mergeSources` above keeps it unique across the
 * effective (pinned + manifest) list too.
 */
export function outputPath(source: Pick<DocSource, "section" | "slug">): string {
  return `${source.section}/${source.slug}.md`;
}

/** `owner/name` from a GitHub remote URL — https, `git@host:owner/name`, or `ssh://` — with any
 *  trailing `.git`/`/` dropped. `null` when the URL has no `owner/name` tail to take. */
export function parseRepoSlug(url: string): string | null {
  const trimmed = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  const match = /[/:]([^/:]+)\/([^/:]+)$/.exec(trimmed);
  return match ? `${match[1]}/${match[2]}` : null;
}

/** The GitHub blob link for one file at one commit. */
export function sourceUrl(repo: string, refSha: string, path: string): string {
  return `https://github.com/${repo}/blob/${refSha}/${path}`;
}

/**
 * One YAML double-quoted scalar. Every value this importer writes needs no more escaping than
 * JSON already gives a plain double-quoted string — YAML's double-quoted scalar follows the
 * same backslash/quote escaping C-style languages do, which is why this hand-rolls frontmatter
 * with no `js-yaml`/`gray-matter` dependency.
 */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

const FRONTMATTER_KEY_RE = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/;

export type FrontmatterValue = string | number | boolean | null;

export interface ParsedFrontmatter {
  /** Every `key: value` line, values decoded: a JSON scalar (`"x"`, `null`, `true`, `3`) as
   *  that scalar, a `'single-quoted'` string unquoted, anything else as its trimmed raw text. */
  fields: Record<string, FrontmatterValue>;
  /** Everything after the closing fence, unmodified. */
  body: string;
}

function decodeValue(raw: string): FrontmatterValue {
  const text = raw.trim();
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      return value as FrontmatterValue;
    }
  } catch {
    // Not a JSON scalar — a bare YAML string (`section: guides`).
  }
  return text;
}

/**
 * Parses a source file's OWN frontmatter — narrowly, so a README that merely opens with a `---`
 * horizontal rule is never touched:
 *
 *   1. The first line must be exactly `---`.
 *   2. A LATER line (the first one found) must be exactly `---` — the closing fence. No such
 *      line -> not frontmatter, `null`.
 *   3. Every non-blank line between the two fences must match `^[A-Za-z][A-Za-z0-9_-]*:` (a
 *      YAML-shaped `key:` line). Any line that doesn't -> not frontmatter, `null` — this is what
 *      keeps a horizontal-rule opener followed by ordinary prose (and a *second*, unrelated `---`
 *      further down) intact. It is also why `templates/page.md` forbids comments inside the block.
 */
export function parseFrontmatter(text: string): ParsedFrontmatter | null {
  const lines = text.split("\n");
  if (lines[0] !== "---") return null;

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return null;

  const fields: Record<string, FrontmatterValue> = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const match = FRONTMATTER_KEY_RE.exec(line);
    if (!match) return null;
    fields[match[1]] = decodeValue(match[2]);
  }

  return { fields, body: lines.slice(end + 1).join("\n") };
}

/** `body` with its own frontmatter block removed (see `parseFrontmatter`), or unchanged. */
export function stripFrontmatter(body: string): string {
  return parseFrontmatter(body)?.body ?? body;
}

/** The reader-facing fields a source file's own frontmatter contributes, after checking. */
export interface SourceMeta {
  description: string;
  format: string;
  shared: boolean;
}

/**
 * Checks a source's own frontmatter against the entry that listed it and returns the fields the
 * rendered page takes from it — or the list of reasons it can't be imported. Rules:
 *
 * - A source under the manifest's `docs/` MUST carry frontmatter (the contract's page shape); one
 *   under a declared root may not (a README), and then gets `description: ""`,
 *   `format: "markdown"`, `shared: true`.
 * - `title` and `section`, when present, must equal the entry's; `key`, when non-null, must equal
 *   its slug. A disagreement fails the run rather than silently picking one side.
 * - `shared` must be a boolean when present; `shared: false` is how an author keeps a listed
 *   page as a draft (the caller skips it — this function only reports the value).
 */
export function checkSourceMeta(
  source: DocSource,
  fields: Record<string, FrontmatterValue> | null,
): SourceMeta | { errors: string[] } {
  if (fields === null) {
    if (source.origin === "docs") {
      return { errors: [`${source.file}: no frontmatter block (see templates/page.md)`] };
    }
    return { description: "", format: "markdown", shared: true };
  }

  const errors: string[] = [];
  const expect = (key: string, wanted: string) => {
    const got = fields[key];
    if (got === undefined || (key === "key" && got === null)) return;
    if (got !== wanted) {
      errors.push(
        `${source.file}: frontmatter ${key} ${JSON.stringify(got)} disagrees with the ` +
          `manifest's ${JSON.stringify(wanted)}`,
      );
    }
  };
  if (source.origin === "docs") {
    for (const key of ["title", "section"]) {
      if (fields[key] === undefined) errors.push(`${source.file}: frontmatter has no ${key}`);
    }
  }
  expect("title", source.title);
  expect("section", source.section);
  expect("key", source.slug);

  const { description = "", format = "markdown", shared = true } = fields;
  if (typeof description !== "string" && description !== null) {
    errors.push(`${source.file}: frontmatter description must be a string`);
  }
  if (typeof format !== "string") errors.push(`${source.file}: frontmatter format must be a string`);
  if (typeof shared !== "boolean") errors.push(`${source.file}: frontmatter shared must be true or false`);
  if (errors.length > 0) return { errors };

  return {
    description: (description as string | null) ?? "",
    format: format as string,
    shared: shared as boolean,
  };
}

/** Where a source came from, stamped by the importer — the `DocWithProvenance` fields
 *  (`packages/studio/src/repos/documents.ts`). */
export interface Provenance {
  /** `owner/name` of the enclosing git repo's `upstream` (else `origin`) remote. */
  sourceRepo: string;
  /** The file's path within that repo. */
  sourcePath: string;
  /** Git blob hash of the file's bytes — a content hash, NOT a commit SHA. */
  sourceSha: string;
  /** The repo's HEAD commit at collection time — NOT a content hash. */
  sourceRefSha: string;
  /** ISO date of the file's last commit — when its content last actually changed. */
  syncedAt: string;
}

/**
 * Render one committed doc file's full bytes: fixed-order frontmatter, matching
 * `content.config.ts`'s Zod schema exactly — `key`, `title`, `section`, `description`, `summary`,
 * `format`, `shared`, `order`, `position`, then the provenance block (`sourceRepo`, `sourcePath`,
 * `sourceSha`, `sourceRefSha`, `sourceUrl`, `syncedAt`) — followed by the source's (already
 * frontmatter-stripped) body, unmodified.
 *
 * PURE. Same inputs, same bytes, always: no clock read (`syncedAt` is a parameter, never
 * `new Date()`). `import-docs.ts`'s shell is the only place that asks git for a date.
 */
export function renderDocFile(
  source: DocSource,
  meta: SourceMeta,
  provenance: Provenance,
  body: string,
): string {
  const frontmatter = [
    "---",
    `key: ${yamlString(source.slug)}`,
    `title: ${yamlString(source.title)}`,
    `section: ${yamlString(source.section)}`,
    `description: ${yamlString(meta.description)}`,
    `summary: ${source.summary === null ? "null" : yamlString(source.summary)}`,
    `format: ${yamlString(meta.format)}`,
    `shared: ${meta.shared}`,
    `order: ${source.order ?? "null"}`,
    `position: ${source.position}`,
    `sourceRepo: ${yamlString(provenance.sourceRepo)}`,
    `sourcePath: ${yamlString(provenance.sourcePath)}`,
    `sourceSha: ${yamlString(provenance.sourceSha)}`,
    `sourceRefSha: ${yamlString(provenance.sourceRefSha)}`,
    `sourceUrl: ${yamlString(sourceUrl(provenance.sourceRepo, provenance.sourceRefSha, provenance.sourcePath))}`,
    `syncedAt: ${yamlString(provenance.syncedAt)}`,
    "---",
    "",
    "",
  ].join("\n");
  return frontmatter + body;
}

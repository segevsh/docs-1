// The pure core of the docs importer: the pinned source list, manifest-entry validation, the
// output-path scheme, frontmatter stripping and rendering. No network, no filesystem, no clock —
// `import-docs.ts` is the impure shell that fetches/reads/writes around this.
//
// Ported from `packages/frontend/packages/app-pages/src/docs-sources.ts` (T3.1.2 contract,
// building-blocks.md#T-3) — same pure-core/impure-shell split, same pinning philosophy, extended
// with manifest-driven discovery (D-B) and frontmatter stripping (D-C). Do NOT extract a shared
// `@w6w/*` package with that file (binding, contract's Context notes): this module is an
// independent port, not a shared dependency.
//
// PINNED. `DOC_SOURCES` is the entire legacy list this importer will ever fetch without a
// manifest saying so; `MANIFEST_REPOS` names the repos whose own `docs/manifest.json` is read for
// additional entries. Neither path ever lists a GitHub directory, tree or search endpoint — every
// file fetched is named either here or in a manifest committed (and PR-reviewed) in its own repo.
// `EXCLUDED_REPOS` names the repos `STRATEGY.md` §5.1 intends open but which are private or absent
// on GitHub today, so the shortfall stays visible in `import-docs.ts`'s own summary output rather
// than a silently smaller catalog looking like a complete one.
//
// `lastChanged` (rendered by `renderDocFile` below) is the source file's own last-COMMIT date,
// never an in-body revision header — these are two different, legitimately-disagreeing dates.
// `import-docs.ts` sources it with one REST call per file; this module only renders whatever
// string it is handed.

import { posix } from "node:path";

/**
 * Groups entries under a heading in the docs rail. The three RFC groups mirror the
 * three-section grouping the site's rail uses today — not derivable from the RFC files
 * themselves, so it is pinned here.
 */
type DocSection = "packages" | "guides" | "app-contract" | "composition" | "host-runtime";

export interface DocSource {
  /** e.g. "w6w-io/w6w-core". */
  repo: string;
  /** Path within that repo, e.g. "README.md" or "rfcs/workflow.md". For a manifest-derived
   *  source this is always the CANONICALIZED path (see `resolveManifestPath`), never the raw
   *  manifest field. */
  path: string;
  /** A pinned entry's section is one of the fixed `DocSection` values; a manifest entry's
   *  section is validated against `SECTION_SLUG_RE` but is otherwise repo-author-chosen —
   *  hence the wider `string` here rather than the narrower `DocSection`. */
  section: string;
  /** File-name-safe, URL-safe segment — becomes `<section>/<slug>.md` (see `outputPath`). */
  slug: string;
  /** Page heading, and the rail's link label for this entry. */
  title: string;
}

/** The 17 real RFCs under `w6w-io/w6w-core`'s `rfcs/` — never `_template.md` (present in the
 *  repo but not a real RFC) and never `interface.md` (Draft status as of 2026-08-28 — a Draft
 *  RFC is not yet a public commitment, so it is excluded exactly like `_template.md`). */
const RFCS: ReadonlyArray<{ slug: string; title: string; section: DocSection }> = [
  // The App contract — what a publisher ships, and what a host may assume about it.
  { slug: "app", title: "App", section: "app-contract" },
  { slug: "action", title: "Action", section: "app-contract" },
  { slug: "param", title: "Param", section: "app-contract" },
  { slug: "auth", title: "Auth", section: "app-contract" },
  { slug: "connection", title: "Connection", section: "app-contract" },
  { slug: "healthcheck", title: "Health Check", section: "app-contract" },
  { slug: "categories", title: "Categories", section: "app-contract" },
  { slug: "image-object", title: "ImageObject", section: "app-contract" },
  // Composition — how one call becomes a reusable operation, an entry point, or a graph.
  { slug: "function", title: "Function", section: "composition" },
  { slug: "endpoint", title: "Endpoint", section: "composition" },
  { slug: "workflow", title: "Workflow", section: "composition" },
  { slug: "node-types", title: "Node Types", section: "composition" },
  { slug: "trigger", title: "Trigger", section: "composition" },
  // Host & runtime — the contracts that make an App portable across implementations.
  { slug: "hook-runtime", title: "Hook Runtime", section: "host-runtime" },
  { slug: "invocation", title: "Invocation", section: "host-runtime" },
  { slug: "registry", title: "Registry", section: "host-runtime" },
  { slug: "engine", title: "Engine", section: "host-runtime" },
];

/**
 * The pinned 22-source list: `core`'s README + its `docs/build-a-w6w-app.md` guide + its 17
 * RFCs, then one README each from `ui`, `apps`, `wrappers`. `wrappers` contributes `README.md`
 * only, **never** `docs/` — that folder's implementer-facing content is deliberately not public.
 */
export const DOC_SOURCES: DocSource[] = [
  {
    repo: "w6w-io/w6w-core",
    path: "README.md",
    section: "packages",
    slug: "core",
    title: "w6w-core",
  },
  {
    // The one file in `w6w-core/docs/`, and the target of seven of the imported RFCs' own
    // cross-references — importing it turns those seven GitHub fallbacks into on-site links.
    repo: "w6w-io/w6w-core",
    path: "docs/build-a-w6w-app.md",
    section: "guides",
    slug: "build-a-w6w-app",
    title: "Build a w6w app",
  },
  ...RFCS.map((r): DocSource => ({
    repo: "w6w-io/w6w-core",
    path: `rfcs/${r.slug}.md`,
    section: r.section,
    slug: r.slug,
    title: r.title,
  })),
  { repo: "w6w-io/w6w-ui", path: "README.md", section: "packages", slug: "ui", title: "w6w-ui" },
  {
    repo: "w6w-io/w6w-apps",
    path: "README.md",
    section: "packages",
    slug: "apps",
    title: "w6w-apps",
  },
  {
    repo: "w6w-io/w6w-wrappers",
    path: "README.md",
    section: "packages",
    slug: "wrappers",
    title: "w6w-wrappers",
  },
];

/**
 * Repos whose `docs/manifest.json` is fetched for additional, manifest-driven sources (D-B).
 * `w6w-io/w6w-studio` is deliberately absent — HITL-1's pinned default: that repo is private, so
 * even though it follows the same convention, nothing under its `docs/` is reachable until it is
 * made public.
 */
export const MANIFEST_REPOS: readonly string[] = [
  "w6w-io/w6w-core",
  "w6w-io/w6w-ui",
  "w6w-io/w6w-wrappers",
  "w6w-io/w6w-apps",
];

/**
 * `STRATEGY.md` §5.1 intends these four open; live GitHub says private or absent today. Not
 * attempted, on purpose — an unauthenticated 404 from `api.github.com` is ambiguous between
 * "went private" and "does not exist", so the importer neither fetches these nor silently drops
 * them from view: they are named here instead.
 */
export const EXCLUDED_REPOS: readonly string[] = [
  "w6w-io/w6w-registry",
  "w6w-io/w6w-workflow",
  "w6w-io/w6w-internal-apps",
  "w6w-io/w6w-studio",
];

/** A manifest entry's `section`/`slug` (and, after canonicalization, the tail of its `path`)
 *  must all be lowercase, hyphenated, filename-safe segments — never a raw manifest string used
 *  as-is anywhere a path or route is built from it. */
const SECTION_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The ONE normalization every subsequent use of a manifest entry's `path` reads from — the raw
 * fetch URL, the commit-date lookup, and the `DocSource.path` stored on the record all use this
 * function's return value, never the raw manifest field (the mechanism this contract pins:
 * canonicalize once, at the sink, rather than blocklisting spellings like `..`/`%2e%2e`/a
 * leading `/`/a backslash).
 *
 * Returns `null` when the entry cannot possibly resolve inside `docs/` (a `..` that cannot be
 * cancelled out — e.g. `"../../../README.md"`). A concatenation that merely lands somewhere
 * *inside* `docs/` that doesn't correspond to a real file (a leading `/`, a same-directory
 * `../`, a percent-encoded spelling that never becomes a literal `..`) is NOT rejected here —
 * it is refused naturally when the (nonexistent) resolved path 404s at fetch time, which is
 * exactly as safe and needs no second blocklist.
 */
function resolveManifestPath(rawPath: string): string | null {
  const resolved = posix.normalize(`docs/${rawPath}`);
  if (resolved !== "docs" && !resolved.startsWith("docs/")) return null;
  if (resolved.split("/").includes("..")) return null;
  return resolved;
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

/** The whole manifest failed to parse as `{ "docs": [...] }` — distinct from a single bad
 *  entry: nothing in the manifest can be trusted, so nothing is expanded. */
export interface ManifestParseFailure {
  manifestError: string;
}

const MANIFEST_ENTRY_KEYS = ["path", "slug", "section", "title"] as const;

/**
 * Parses and validates one repo's fetched `docs/manifest.json` body. Pure — takes the raw JSON
 * text and the owning repo name, returns either a manifest-level parse failure or a per-entry
 * expansion. `import-docs.ts`'s shell does the actual `fetch`.
 */
export function expandManifest(
  repo: string,
  rawJson: string,
): ManifestExpansion | ManifestParseFailure {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    return {
      manifestError: `${repo}: docs/manifest.json is not valid JSON (${(error as Error).message})`,
    };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { docs?: unknown }).docs)
  ) {
    return { manifestError: `${repo}: docs/manifest.json is missing a "docs" array` };
  }

  const entries = (parsed as { docs: unknown[] }).docs;
  const sources: DocSource[] = [];
  const failures: ManifestEntryFailure[] = [];

  entries.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      failures.push({
        index,
        error: `${repo} docs/manifest.json entry ${index}: not an object`,
      });
      return;
    }
    const entry = raw as Record<string, unknown>;
    for (const key of MANIFEST_ENTRY_KEYS) {
      if (typeof entry[key] !== "string") {
        failures.push({
          index,
          error: `${repo} docs/manifest.json entry ${index}: "${key}" is missing or not a string`,
        });
        return;
      }
    }
    const path = entry.path as string;
    const slug = entry.slug as string;
    const section = entry.section as string;
    const title = entry.title as string;

    const resolved = resolveManifestPath(path);
    if (resolved === null) {
      failures.push({
        index,
        error: `${repo} docs/manifest.json entry ${index}: path "${path}" escapes docs/`,
      });
      return;
    }
    if (!SECTION_SLUG_RE.test(slug)) {
      failures.push({
        index,
        error: `${repo} docs/manifest.json entry ${index}: slug "${slug}" must match ${SECTION_SLUG_RE}`,
      });
      return;
    }
    if (!SECTION_SLUG_RE.test(section)) {
      failures.push({
        index,
        error: `${repo} docs/manifest.json entry ${index}: section "${section}" must match ${SECTION_SLUG_RE}`,
      });
      return;
    }

    sources.push({ repo, path: resolved, slug, section, title });
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
  /** The effective source list — pinned ∪ manifest-derived, deduplicated by `(section, slug)`. */
  sources: DocSource[];
  /** Two DIFFERENT `(repo, path)` pairs resolving to the same `(section, slug)` — a hard-fail. */
  collisions: SourceCollision[];
}

/**
 * D-B: the effective source list is the pinned array UNION the fetched manifests, deduplicated
 * by `(section, slug)`. Two entries sharing that key from the SAME `(repo, path)` collapse to
 * one silently (a manifest may legitimately re-list something the pinned array already has,
 * once `core`'s manifest stops being empty); from a DIFFERENT `(repo, path)` it is a collision
 * that must abort the whole run — `outputPath` uniqueness is the invariant this protects.
 */
export function mergeSources(pinned: DocSource[], manifestSources: DocSource[]): MergeResult {
  const bySlug = new Map<string, DocSource>();
  const collisions: SourceCollision[] = [];

  for (const source of [...pinned, ...manifestSources]) {
    const key = `${source.section}/${source.slug}`;
    const existing = bySlug.get(key);
    if (!existing) {
      bySlug.set(key, source);
    } else if (existing.repo === source.repo && existing.path === source.path) {
      // Same origin, same target — silent dedup.
    } else {
      collisions.push({ section: source.section, slug: source.slug, a: existing, b: source });
    }
  }

  return { sources: [...bySlug.values()], collisions };
}

/**
 * Where one source's rendered file lands, relative to the `docs` collection's base
 * (`src/content.config.ts`'s `glob({ pattern: "**\/*.md", base: "./src/content/docs" })`).
 * `<section>/<slug>.md` — unique by construction across the pinned list, and `mergeSources`
 * above is what keeps it unique across the effective (pinned + manifest) list too.
 */
export function outputPath(source: DocSource): string {
  return `${source.section}/${source.slug}.md`;
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

const FRONTMATTER_KEY_RE = /^[A-Za-z][A-Za-z0-9_-]*:/;

/**
 * Strips a source file's OWN frontmatter before it is prepended with `renderDocFile`'s generated
 * block (D-C) — narrowly, so a README that merely opens with a `---` horizontal rule is never
 * touched:
 *
 *   1. The first line must be exactly `---`.
 *   2. A LATER line (the first one found) must be exactly `---` — the closing fence. No such
 *      line -> not frontmatter, return `body` unchanged.
 *   3. Every non-blank line between the two fences must match `^[A-Za-z][A-Za-z0-9_-]*:` (a
 *      YAML-shaped `key:` line). Any line that doesn't -> not frontmatter, return `body`
 *      unchanged — this is what keeps a horizontal-rule opener followed by ordinary prose (and a
 *      *second*, unrelated `---` further down) intact.
 *
 * Pure — a source body's manifest-declared `title`/`section` (not whatever this strips out) are
 * what `renderDocFile` renders; a stripped block's own values are simply discarded.
 */
export function stripFrontmatter(body: string): string {
  const lines = body.split("\n");
  if (lines[0] !== "---") return body;

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return body;

  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!FRONTMATTER_KEY_RE.test(line)) return body;
  }

  return lines.slice(end + 1).join("\n");
}

/**
 * Render one committed doc file's full bytes: fixed-order frontmatter — `sourceRepo`,
 * `sourcePath`, `lastChanged`, `title`, `section`, matching `content.config.ts`'s Zod schema
 * exactly — followed by the source's (already frontmatter-stripped) body, unmodified.
 *
 * PURE. Same three inputs, same bytes, always: no clock read (`lastChanged` is a parameter,
 * never `new Date()`). `import-docs.ts`'s shell is the only place that reads a clock-adjacent
 * value (the GitHub commit date) and strips a body's own frontmatter, and it does both once,
 * before calling this.
 */
export function renderDocFile(source: DocSource, body: string, lastChanged: string): string {
  const frontmatter = [
    "---",
    `sourceRepo: ${yamlString(source.repo)}`,
    `sourcePath: ${yamlString(source.path)}`,
    `lastChanged: ${yamlString(lastChanged)}`,
    `title: ${yamlString(source.title)}`,
    `section: ${yamlString(source.section)}`,
    "---",
    "",
    "",
  ].join("\n");
  return frontmatter + body;
}

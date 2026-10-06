import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content collections for docs.w6w.io.
 *
 * Both collections read from the SAME root — `content/`, a sibling of
 * `src/`, not nested under it — so a content file's path on disk matches its
 * URL exactly (`content/packages/core.md` → `/packages/core/`,
 * `content/quickstart.md` → `/quickstart/`). There is deliberately no
 * `docs/`/`site-docs/` wrapper folder: neither word is ever part of a route,
 * so neither belongs in the path. The two collections are told apart by
 * PATTERN instead of by folder — see each one's own comment below.
 *
 * `DOCS_CONTENT_DIR` swaps the root for the e2e suite only — mirrors
 * `packages/frontend/packages/web/src/content.config.ts`'s `W6W_APPS_DIR`
 * switch exactly. `tests/fixture-site.mjs` sets it to
 * `./tests/fixtures/content` and builds against synthetic edge-case docs
 * (long titles, every channel tag, rich prose) that must never reach a real
 * build — a normal `pnpm build`/`pnpm dev` never sets this var, so it reads
 * the real `content/` untouched. Project-root-relative, like Astro's own
 * `base` convention (not relative to this file).
 */
const CONTENT_ROOT = process.env.DOCS_CONTENT_DIR ?? "./content";

/**
 * Imported markdown — docs collected from each package's own `docs/` folder (listed in its
 * `docs/manifest.json`) plus the importer's pinned list (see `CONTRIBUTING.md`).
 * `src/lib/import-docs.ts` writes into this collection against this exact schema.
 *
 * Matched by `*\/**\/*.md` — at least one directory level under `content/`, i.e.
 * `<section>/<slug>.md` and a sub-page's `<section>/<parent>/<child>.md` — which is also what
 * keeps this collection from ever matching a root-level hand-authored file (see `siteDocs`
 * below): a root file has no `/` in its path relative to `content/`, so it can't match this
 * pattern, and `siteDocs`'s own `*.md` can't match a nested one. That mutual exclusion needs no
 * wrapper folder to hold — the shapes alone are disjoint.
 *
 * ENTIRELY IMPORTER-OWNED: every nested `.md` under `content/` that the importer's effective
 * source list does not claim is DELETED on the next `pnpm import-docs` run — scoped to files
 * this pattern matches, so a root-level `siteDocs` file is never a candidate for deletion. Do
 * NOT hand-author a page matching this pattern — see `siteDocs` below for hand-authored content.
 *
 * Strict (not `.passthrough()`): this frontmatter is entirely generator-owned (the importer
 * writes every key, `renderDocFile` in `src/lib/doc-sources.ts`), so there is no "upstream
 * declares a key we didn't anticipate" case to guard against. The fields follow the document
 * model — `Doc` + `DocWithProvenance` in `packages/studio/src/repos/documents.ts` — minus the
 * server-issued `id`/`createdAt`/`updatedAt`, plus the rail's `order`/`position`.
 *
 * The keys the 2026-10-06 importer added (everything but `title`, `section`, `sourceRepo`,
 * `sourcePath`, `syncedAt`) are `.optional()` ONLY so content committed by the previous importer
 * still validates until the next `pnpm import-docs` rewrites it; once every committed file
 * carries them, drop the `.optional()`s.
 */
const docs = defineCollection({
  loader: glob({ pattern: "*/**/*.md", base: CONTENT_ROOT }),
  schema: z
    .object({
      /** The page's stable key — its slug within the section (`workflows/triggers`). */
      key: z.string().optional(),
      /** Page heading, and the rail's link label for this entry. */
      title: z.string(),
      /** Groups entries under a heading in the docs rail (e.g. "packages", "studio"). */
      section: z.string(),
      /** One reader-facing sentence; the page's meta description. */
      description: z.string().optional(),
      /** One reader-facing line for the section landing page (the manifest's `summary`). */
      summary: z.string().nullable().optional(),
      /** Always "markdown" for a docs page. */
      format: z.string().optional(),
      /** Always true here — a `shared: false` source is a draft the importer never writes. */
      shared: z.boolean().optional(),
      /** Rail position within its level; `null` sorts after every ordered sibling. */
      order: z.number().int().nullable().optional(),
      /** Index in the list that declared the entry — the rail's tie-break after `order`. */
      position: z.number().int().optional(),
      /** `owner/name` of the repo the content was collected from, e.g. "w6w-io/w6w-core". */
      sourceRepo: z.string(),
      /** Path to the source file within that repo, e.g. "README.md". */
      sourcePath: z.string(),
      /** Git blob hash of the source file's bytes — a content hash, not a commit SHA. */
      sourceSha: z.string().optional(),
      /** The source repo's HEAD commit at collection time — not a content hash. */
      sourceRefSha: z.string().optional(),
      /** Link to the source file on GitHub at `sourceRefSha`. */
      sourceUrl: z.string().optional(),
      /** ISO date of the source file's last commit — when its content last actually changed. */
      syncedAt: z.string(),
    })
    .strict(),
});

/**
 * Site-authored docs — content this site writes itself, as opposed to
 * `docs` above (entirely importer-owned). Matched by `*.md` — root-level
 * files directly under `content/` only, never a subdirectory — which is the
 * pattern-level guarantee the importer's prune sweep can't reach these.
 *
 * Two entries today: `index` (`/`, `pages/index.astro`) and `quickstart`
 * (`/quickstart/`, `pages/quickstart.astro`).
 */
const siteDocs = defineCollection({
  loader: glob({ pattern: "*.md", base: CONTENT_ROOT }),
  schema: z.object({ title: z.string(), description: z.string() }),
});

export const collections = { docs, siteDocs };

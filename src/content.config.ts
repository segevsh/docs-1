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
 * Imported markdown — docs pulled from each in-scope package repo's own
 * `docs/` folder (see `CONTRIBUTING.md` for which repos are in scope and
 * what "in scope" means). T3.1.2's importer writes into this collection
 * against this exact schema; it must not change the schema, only add files
 * that validate against it.
 *
 * Matched by the glob pattern below — one directory level under `content/`,
 * i.e. `<section>/<slug>.md` — which is also what keeps this collection from
 * ever matching a root-level hand-authored file (see `siteDocs` below):
 * a root file has no `/` in its path relative to `content/`, so it can't
 * match this pattern, and `siteDocs`'s own pattern can't match a nested one.
 * That mutual exclusion needs no wrapper folder to hold — the shapes alone
 * are disjoint.
 *
 * ENTIRELY IMPORTER-OWNED: every `<section>/<slug>.md` under `content/` that
 * the importer's source list does not claim is DELETED on the next
 * `pnpm import-docs` run (ported from `import-docs.ts:122-138` in T3.1.2) —
 * scoped to files this pattern matches, so a root-level `siteDocs` file is
 * never a candidate for deletion. Do NOT hand-author a page matching this
 * pattern — see `siteDocs` below for hand-authored content instead.
 *
 * Strict (not `.passthrough()`): this frontmatter is entirely
 * generator-owned (the importer writes every key), so there is no
 * "upstream declares a key we didn't anticipate" case to guard against.
 */
const docs = defineCollection({
  loader: glob({ pattern: "*/*.md", base: CONTENT_ROOT }),
  schema: z
    .object({
      /** Page heading, and the rail's link label for this entry. */
      title: z.string(),
      /** Groups entries under a heading in the docs rail (e.g. "core", "ui"). */
      section: z.string(),
      /** Source repo the content was imported from, e.g. "w6w-io/w6w-core". */
      sourceRepo: z.string(),
      /** Path to the source file within that repo, e.g. "README.md". */
      sourcePath: z.string(),
      /** ISO date of the source file's last commit. */
      lastChanged: z.string(),
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

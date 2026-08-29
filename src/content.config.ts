import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content collections for docs.w6w.io.
 *
 * Two collections, deliberately split — see the `docs` collection's own
 * comment below for why. This split mirrors
 * `packages/frontend/packages/web/src/content.config.ts`'s `docs` /
 * `siteDocs` split field-for-field (this repo's exemplar for
 * T3.1.1/T3.1.2/T3.1.3, which mirror this shape in turn).
 */

/**
 * Imported markdown — docs pulled from each in-scope package repo's own
 * `docs/` folder (see `CONTRIBUTING.md` for which repos are in scope and
 * what "in scope" means). T3.1.2's importer writes into this collection
 * against this exact schema; it must not change the schema, only add files
 * that validate against it.
 *
 * ENTIRELY IMPORTER-OWNED: everything under `src/content/docs/` that the
 * importer's source list does not claim is DELETED on the next
 * `pnpm import-docs` run (ported from `import-docs.ts:122-138` in T3.1.2).
 * Do NOT hand-author a page under this collection's base — see `siteDocs`
 * below for hand-authored content instead.
 *
 * Strict (not `.passthrough()`): this frontmatter is entirely
 * generator-owned (the importer writes every key), so there is no
 * "upstream declares a key we didn't anticipate" case to guard against.
 */
const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
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
 * `docs` above (entirely importer-owned). Kept in a separate
 * directory/collection for exactly that reason — the importer only ever
 * touches `content/docs/`, so a hand-authored page filed under `docs/`
 * would survive exactly until the next import.
 *
 * One entry today: `index`, rendered at `/` (`pages/index.astro`).
 */
const siteDocs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/site-docs" }),
  schema: z.object({ title: z.string(), description: z.string() }),
});

export const collections = { docs, siteDocs };

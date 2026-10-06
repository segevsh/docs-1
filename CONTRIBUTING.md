# Contributing docs to docs.w6w.io

This is the one canonical description of the `docs/` + `docs/manifest.json` convention every w6w
package follows. Docs live in the SAME repo as the code they describe, next to it, instead of
being hand-copied into a separate docs repo — so a PR that changes behavior can update the doc in
the same commit. `docs.w6w.io` (this repo) collects from each package's `docs/` folder rather than
owning the prose itself.

This file supersedes `packages/studio/docs/README.md`, which held this convention before it was
generalised here from "Studio" to "any w6w package repo"; that repo's copy is trimmed to a
pointer back at this file separately.

## How pages are collected

`pnpm import-docs` (see [`README.md`](./README.md#the-importer)) walks the local monorepo
checkout — `packages/` and everything under it — and finds every `docs/manifest.json`. Each file
a manifest lists becomes one page. Nobody keeps a list of participating repos: a package
publishes by having a manifest, and opts out with a `.docsignore`.

- **`.docsignore`** — a file of that name in a directory makes the importer skip that directory
  and everything under it. Presence is the signal; put a one-line reason in it. Packages that
  publish nothing (`apps`, `admin`, `control`, …) carry one at their root, and so does this repo.
- The walk also never enters `node_modules`, `dist`, `build`, or any dot-directory.

**The manifest is the only publish gate.** The importer reads the local checkout, not public
GitHub, so a private repo's `docs/` is publishable exactly like a public one's — `studio` is
today's instance. Anything a manifest lists ends up on the public site, whatever the visibility
of the repo it came from. A file in `docs/` that no manifest lists is never read: draft freely,
and add it to the manifest when it is ready to publish.

## Convention

- One `.md` file per page, anywhere under the package's `docs/` folder. Subfolders are fine
  (`docs/workflows/triggers.md`).
- Every listed file starts with the frontmatter in [`templates/page.md`](./templates/page.md),
  which follows the document model (`Doc` + `DocWithProvenance` in
  `packages/studio/src/repos/documents.ts`). You fill in `key` (the manifest slug), `title`,
  `section`, `description`, `format` (`"markdown"`) and `shared`; leave every other field `null`
  — the importer stamps the provenance (`sourceRepo`, `sourcePath`, `sourceSha`, `sourceRefSha`,
  `sourceUrl`, `syncedAt`). Use `key: value` lines only, with no comments inside the block.
- `title` and `section` must equal the manifest entry's, and `key` must equal its `slug` —
  a disagreement fails the import rather than silently picking one side.
- `shared: false` keeps a listed page as a draft: the importer skips it (and reports it), and
  removes the page from the site if it was published before.
- Follow `templates/page.md`'s house rules for the body. Link to other pages by their site route
  (`/studio/workflows/`), never by repo-relative path.

### The manifest entry schema

Each entry in a package's `docs/manifest.json`'s `docs` array:

| key       | meaning                                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| `path`    | the file, relative to `docs/` — e.g. `"overview.md"`, `"workflows/triggers.md"`. Must stay inside `docs/` |
| `slug`    | one segment (`workflows`) or two (`workflows/triggers`); each segment lowercase and hyphenated, never `index`. The page's route is `/<section>/<slug>/` |
| `section` | the nav group, lowercase and hyphenated. Must match the frontmatter `section`           |
| `title`   | the page heading and its nav label. Must match the frontmatter `title`                  |
| `order`   | optional integer. The nav sorts ascending within each level; entries without one come after, in manifest order |

`(section, slug)` must be unique across the whole site — two different files claiming the same
one fail the import.

```json
{
  "docs": [
    { "path": "overview.md",           "slug": "overview",           "section": "studio", "title": "Studio overview", "order": 0 },
    { "path": "workflows/index.md",    "slug": "workflows",          "section": "studio", "title": "Workflows",       "order": 40 },
    { "path": "workflows/triggers.md", "slug": "workflows/triggers", "section": "studio", "title": "Triggers",        "order": 10 }
  ]
}
```

### Sub-pages

A two-segment slug is a sub-page of the one-segment slug before the `/`: `workflows/triggers`
nests under `workflows` in the nav, and lives at `/studio/workflows/triggers/`. The parent must
be a published page in the same section, or the import fails. One level of nesting only.

## Commit before you import

The importer refuses a listed file with uncommitted changes (`git status` shows it), so
work in progress is never published by accident — and so every page's `sourceRefSha` and
`sourceUrl` point at a commit that really contains what was published. Commit the doc in its own
repo first, then run `pnpm import-docs` here. `--allow-dirty` overrides the check for a local
preview; don't commit what it produces.

## Adding a doc

1. Copy [`templates/page.md`](./templates/page.md) into your package's `docs/` folder and fill in
   its frontmatter and sections.
2. Add an entry to `docs/manifest.json`: `path`, `slug`, `section`, `title` (mirror the
   frontmatter), and `order` if its place in the nav matters.
3. Ship it in the same PR as the code change it documents.
4. Once that's merged, run `pnpm import-docs` in this repo and commit the `content/` diff.

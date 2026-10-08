# Contributing docs to docs.w6w.io

This is the one canonical description of the `docs/` + `docs/manifest.json` convention every w6w
package follows. Docs live in the SAME repo as the code they describe, next to it, instead of
being hand-copied into a separate docs repo — so a PR that changes behavior can update the doc in
the same commit. `docs.w6w.io` (this repo) collects from each package's `docs/` folder rather than
owning the prose itself.

## How pages are collected

`node src/lib/import-docs.ts --root <dir>` (alias `pnpm import-docs`) walks a **root** directory
that holds one checkout per source repo as siblings (`<root>/core`, `<root>/server`, …) and
finds every `docs/manifest.json`. Each file a manifest lists becomes one page under `content/`.
Nobody keeps a list of participating repos: a repo publishes by having a manifest, and opts out
with a `.docsignore`.

- **`.docsignore`** — a file of that name in a directory makes the importer skip that directory
  and everything under it. Presence is the signal; put a one-line reason in it. This repo carries one.
- The walk also never enters `node_modules`, `dist`, `build`, or any dot-directory (so `.task/`
  and `.worktrees/` are invisible to it).
- The one generated page, `reference-api/http-api`, is built from `<root>/wrappers/endpoints.json`,
  not from a manifest.

**The manifest is the only publish gate.** A file in `docs/` that no manifest lists is never read:
draft freely, and add it to the manifest when it is ready to publish. Anything a manifest lists
ends up on the public site, whatever the visibility of its repo.

### Running the import

```sh
node src/lib/import-docs.ts --root <dir>   # <dir> holds core/ server/ wrappers/ studio/ apps/ ui/ …
node src/lib/import-docs.ts --root <dir> --dry-run
node src/lib/import-docs.ts --root <dir> --allow-dirty   # local preview only
```

`content/` is committed and must equal a fresh import (a second run reports 0 written). CI does not
trust the committed copy blindly: `.github/workflows/deploy.yml` mints a GitHub App installation token
(`APP_ID` / `APP_PRIVATE_KEY`, owner `w6w-io`), checks out the six source repos beside this one, runs
the import, then builds.

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

### The manifest grammar

A `docs/manifest.json` is an object with exactly two allowed top-level keys, `docs` (required) and
`roots` (optional); any other key fails the import.

- **`roots`** — a list of repo-relative paths (directories or single files) outside `docs/` whose
  files a manifest entry may name, e.g. `["rfcs", "README.md"]`. A root may not contain `..`, be
  absolute, or be `docs` or under it. A file under `docs/` must carry the frontmatter; a file under
  a root may omit it.
- **`docs`** — an array of entries. Each entry allows exactly these keys:

| key       | required | meaning |
| --------- | -------- | ------- |
| `path`    | yes | the file, relative to `docs/` (`"overview.md"`, `"workflows/triggers.md"`) or inside a declared root. Must stay inside `docs/` and the roots |
| `slug`    | yes | one segment (`workflows`) or two (`workflows/triggers`); each lowercase and hyphenated, never `index`. The route is `/<section>/<slug>/` |
| `section` | yes | one of the **closed sections** below. Must match the frontmatter `section` |
| `title`   | yes | the page heading and nav label. Must match the frontmatter `title` |
| `order`   | no  | integer. The rail sorts ascending within each level; entries without one come after, in manifest order |
| `summary` | no  | one reader-facing line shown on the section landing page |

### Closed sections

`section` is not free text. It must be one of (rail order): `get-started`, `guides`, `clients`,
`self-hosting`, `build-apps`, `reference-spec`, `reference-api`, `reference-packages`. The list is
`SECTIONS` in `src/lib/doc-sources.ts`; the importer refuses an unknown section and the
`content.config.ts` schema (`z.enum(SECTIONS)`) fails the build on one in committed content. Adding a
section is a change to this repo, not to a source repo.

`get-started/what-is-w6w` and `get-started/core-concepts` are the **only site-authored pages**
(they live directly in this repo's `content/` and the importer leaves them alone). Every other page
is owned by the repo that documents the behavior and arrives through its manifest.

`(section, slug)` must be unique across the whole site — two different files claiming the same
one fail the import.

```json
{
  "roots": ["README.md"],
  "docs": [
    { "path": "overview.md",           "slug": "overview",           "section": "guides", "title": "Overview",  "order": 0 },
    { "path": "workflows/index.md",    "slug": "workflows",          "section": "guides", "title": "Workflows", "order": 40, "summary": "Build and run workflows." },
    { "path": "workflows/triggers.md", "slug": "workflows/triggers", "section": "guides", "title": "Triggers",  "order": 10 }
  ]
}
```

### Link rules

Link to other pages by their **site route** (`/guides/workflows/`), never by repo-relative path.
A relative link from a collected page to another collected page is rewritten to its route. A relative
link into a file no manifest lists is rewritten to its GitHub URL for public repos — but for the
private repos (`server`, `studio`, `control`, `admin`; `PRIVATE_REPOS` in `src/lib/doc-sources.ts`)
it fails the import, because the public site must not link to private source. A link that escapes the
repo fails too.

### Sub-pages

A two-segment slug is a sub-page of the one-segment slug before the `/`: `workflows/triggers`
nests under `workflows` in the nav, and lives at `/studio/workflows/triggers/`. The parent must
be a published page in the same section, or the import fails. One level of nesting only.

## Commit before you import

The importer refuses a listed file with uncommitted changes (`git status` shows it), so
work in progress is never published by accident — and so every page's `sourceRefSha` and
`sourceUrl` point at a commit that really contains what was published. Commit the doc in its own
repo first, then run the import here. `--allow-dirty` overrides the check for a local
preview; don't commit what it produces.

## Adding a doc

1. Copy [`templates/page.md`](./templates/page.md) into your package's `docs/` folder and fill in
   its frontmatter and sections.
2. Add an entry to `docs/manifest.json`: `path`, `slug`, `section`, `title` (mirror the
   frontmatter), and `order` if its place in the nav matters.
3. Ship it in the same PR as the code change it documents.
4. Once that's merged, a dispatch (or release) rebuilds the site from the merged repos; to refresh the committed `content/`, run the import here and commit the diff.

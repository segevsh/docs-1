# @w6w/docs

The source for `docs.w6w.io` lives in this package. It is an Astro static site: package-owned
Markdown is collected into `content/`, then Astro renders it into `dist/`.

## Run locally

Use Node 24, as in CI, and the pnpm version declared in `package.json`.

```sh
# From packages/docs in the monorepo:
pnpm install
pnpm import-docs --dry-run   # inspect the full collection without writing
pnpm import-docs             # refresh content/ from sibling packages
pnpm dev                    # serve the collected content
pnpm build                  # compile content/ into dist/
pnpm preview                # serve dist/ locally
pnpm check                  # Astro type checking
pnpm test                   # importer, navigation and rendering unit tests
pnpm check:tokens           # compare vendored tokens with w6w-branding
```

`dev` and `build` read the current `content/` snapshot; they do not run the importer themselves.
Run `import-docs` after changing a source package. Node 22 installations without default type
stripping need `node --experimental-strip-types src/lib/import-docs.ts` for the importer.

## How package docs become pages

1. `src/lib/import-docs.ts` walks the source root, which defaults to the monorepo's `packages/`
   directory, and finds every `docs/manifest.json`.
2. Each manifest lists the files to publish, their `section`, `slug`, `title` and navigation
   order. `src/lib/doc-sources.ts` validates those entries and their source frontmatter. An
   unlisted Markdown file is not published; `shared: false` leaves a listed page as a draft.
3. The importer reads the listed files, rewrites relative links, and adds Git provenance. It
   writes `content/<section>/<slug>.md`, including nested slugs such as `embed/workflows`.
   The HTTP API reference is generated separately from `wrappers/endpoints.json`.
4. `src/content.config.ts` loads the generated Markdown into Astro's `docs` collection.
   `src/pages/[...slug].astro` renders one page per entry at `/<section>/<slug>/`.
5. `src/lib/rail.ts` builds navigation from the collection metadata. Two-segment slugs nest
   below their parent; no separate navigation registration is needed.

There is no hard-coded source-page list. The walk skips `node_modules`, `dist`, `build`, all
hidden directories, and directories containing `.docsignore`. This package has `.docsignore`
so generated content cannot be collected as another source.

The importer gathers and validates every source before writing. Missing files, duplicate
routes, orphaned sub-pages, mismatched frontmatter, invalid links or uncommitted source changes
fail the import without a partial update. `--allow-dirty` permits a local preview of uncommitted
sources; do not commit generated content from that mode.

### Source root and pruning

The root must contain **all** source repositories as siblings (`core`, `server`, `wrappers`,
`studio`, `apps`, `ui`). In a standalone checkout, use `--root` or `DOCS_SOURCE_ROOT`:

```sh
pnpm import-docs --root /path/to/sources --dry-run
pnpm import-docs --root /path/to/sources
```

Do not point a writing import at only `packages/studio`: the importer removes generated pages
not claimed by the discovered sources. A single-repository root would prune other packages'
pages. Use the full monorepo `packages/` directory even when only Studio docs changed.

`content/<section>/...` is importer-owned. Edit each package's original docs, then regenerate;
do not patch the generated copy. Root-level `content/*.md` contains the site-authored pages
and is outside the prune sweep. A second import against unchanged sources should report zero
writes and zero removals.

Each generated page records `sourceRepo`, `sourcePath`, `sourceSha` (file content hash),
`sourceRefSha` (source checkout HEAD), `sourceUrl` and `syncedAt` (the file's last commit date).
The repository name comes from `upstream`, falling back to `origin`; importing a fork checkout
does not mean its commit has reached the upstream branch.

## Studio and the embed package

Studio's public docs are declared in `../studio/docs/manifest.json`. The importer reads that
manifest from the Studio repository root; it does not need a second manifest inside
`studio/packages/embed`.

| Studio source | Generated content | Website route |
| --- | --- | --- |
| `docs/overview.md` | `content/guides/overview.md` | `/guides/overview/` |
| `docs/embed/index.md` | `content/clients/embed.md` | `/clients/embed/` |
| `docs/embed/workflows.md` | `content/clients/embed/workflows.md` | `/clients/embed/workflows/` |
| `docs/embed/reference.md` | `content/clients/embed/reference.md` | `/clients/embed/reference/` |

The three embed pages appear under **Clients → Embed the workflow editor**; the list/create
example and API/lifecycle reference are child pages. The separate SDK embedding guide at
`/guides/embed/` comes from the wrappers repository.

After importing and building, check `dist/clients/embed/index.html`,
`dist/clients/embed/workflows/index.html` and `dist/clients/embed/reference/index.html`.
The Clients landing page at `/clients/` should link to the embed parent page.

## CI and deployment

`.github/workflows/deploy.yml` checks out this repository plus the six source repositories
from `w6w-io`, imports their docs, builds the site, then deploys `dist/` to the Cloudflare Pages
project `w6w-docs`. It runs on a published release or a `Build + Deploy` workflow dispatch.
It imports fresh sources in CI, even if the committed local `content/` snapshot is older.

Studio's `.github/workflows/docs-dispatch.yml` dispatches that build when a push to its upstream
`main` changes `docs/**`. Both workflows have upstream-repository guards. A push to a personal
fork does not update the live site: the source change must reach `w6w-io/w6w-studio`, and the
upstream dispatch/deploy must succeed. Cross-repository access uses the configured GitHub App.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the complete source manifest and frontmatter rules.

## Design tokens

`src/styles/tokens.css` is a vendored copy of `w6w-io/w6w-branding`'s `tokens/tokens.css`,
checked by `scripts/check-tokens.mjs`. CI does not check out a sibling branding repository.

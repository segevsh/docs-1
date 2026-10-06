# @w6w/docs

Public documentation site for w6w — `docs.w6w.io`. Astro, static-first, single package.

## Running

```bash
pnpm install
pnpm dev            # dev server
pnpm build          # static build -> dist/
pnpm preview        # serve the build locally
pnpm check          # astro check (typecheck)
pnpm check:tokens   # verify src/styles/tokens.css hasn't drifted from w6w-io/w6w-branding
pnpm import-docs    # collect every pinned + manifest-listed doc from the local checkout into content/
pnpm test           # node --test the importer's unit suites
```

## Content

`content/` is a sibling of `src/`, not nested under it — a file's path there matches its route
exactly (`content/packages/core.md` → `/packages/core/`, `content/studio/workflows/triggers.md` →
`/studio/workflows/triggers/`, `content/quickstart.md` → `/quickstart/`). Two collections read
from this one root (`src/content.config.ts`), told apart by pattern rather than by a wrapper
folder:

- `content/<section>/<slug>.md` and a sub-page's `content/<section>/<parent>/<child>.md` —
  imported markdown, one file per source doc, matched by `*/**/*.md`. **Entirely
  importer-owned**: `pnpm import-docs` (`src/lib/import-docs.ts`) deletes anything matching this
  shape its effective source list doesn't claim. Never hand-author a page here.
- `content/*.md` (root-level only) — hand-authored pages this site writes itself (`index.md` for
  `/`, `quickstart.md` for `/quickstart/`), matched by `*.md`. The importer's prune sweep can't
  reach these — see `content.config.ts`'s own comment for why the two patterns are disjoint by
  construction, no wrapper folder required.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the `docs/` + `docs/manifest.json` convention
every source package follows, and what makes a doc eligible to land here.

## The importer

CI never runs the importer. You run it locally from a full monorepo checkout and commit the
resulting `content/` diff — that diff is the review of what gets published.

```bash
pnpm import-docs --dry-run   # print what would be written and pruned; write nothing
pnpm import-docs             # write content/, then review and commit the diff
```

It collects two kinds of source, all read from the local checkout (no network):

- **Pinned** — `src/lib/doc-sources.ts`'s `DOC_SOURCES`: `core`'s README, its
  `docs/build-a-w6w-app.md` guide and 17 RFCs, and the `ui` and `wrappers` READMEs.
- **Discovered** — it walks the source root for every `docs/manifest.json` and imports the files
  each one lists. The walk never enters `node_modules`, `dist`, `build`, any dot-directory, or
  any directory holding a `.docsignore` file (that directory and everything under it — this repo
  has one at its root, so the site never collects itself).

The source root defaults to the directory this package sits in (the monorepo's `packages/`). From
a git worktree that isn't true, so point it explicitly with `--root <dir>` or
`DOCS_SOURCE_ROOT=<dir>`.

Each page is stamped with provenance from git: `sourceRepo` (the enclosing repo's `upstream`
remote, else `origin`), `sourcePath`, `sourceSha` (the blob hash of the file), `sourceRefSha`
(that repo's `HEAD`), `sourceUrl`, and `syncedAt` (the file's last commit date).

It gathers everything first and writes only if everything validated — one failure (a missing
file, a bad manifest entry, a path-traversal attempt, a `(section, slug)` collision, a sub-page
without its parent, frontmatter that disagrees with its manifest entry, or a listed file with
**uncommitted changes**) leaves `content/` untouched and exits non-zero, naming every failure.
Pass `--allow-dirty` to collect uncommitted work anyway (for a preview — don't commit what it
produces). A listed page whose own frontmatter says `shared: false` is skipped and reported. On a
clean run it also prunes anything under the collection root no published source claims, removing
folders it leaves empty. `pnpm test` exercises all of this against a fake checkout — no real
filesystem or git is needed to validate the importer's own logic.

## Design tokens

`src/styles/tokens.css` is a vendored, byte-identical copy of
`w6w-io/w6w-branding`'s `tokens/tokens.css`, guarded by `scripts/check-tokens.mjs`
(`pnpm check:tokens`). It is not `@import`ed across the filesystem because this repo's CI
checks out no sibling `branding` repo — see the file's own header.

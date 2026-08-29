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
pnpm import-docs    # fetch every pinned + manifest-declared doc into content/<section>/
pnpm test           # node --test the importer's unit suites
```

## Content

`content/` is a sibling of `src/`, not nested under it — a file's path there matches its route
exactly (`content/packages/core.md` → `/packages/core/`, `content/quickstart.md` →
`/quickstart/`). Two collections read from this one root (`src/content.config.ts`), told apart by
pattern rather than by a wrapper folder:

- `content/<section>/<slug>.md` — imported markdown, one file per source doc, matched by
  `*/*.md`. **Entirely importer-owned**: `pnpm import-docs` (`src/lib/import-docs.ts`) deletes
  anything matching this shape its effective source list doesn't claim. Never hand-author a page
  here.
- `content/*.md` (root-level only) — hand-authored pages this site writes itself (`index.md` for
  `/`, `quickstart.md` for `/quickstart/`), matched by `*.md`. The importer's prune sweep can't
  reach these — see `content.config.ts`'s own comment for why the two patterns are disjoint by
  construction, no wrapper folder required.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the `docs/` + `docs/manifest.json` convention
every source package repo follows, and what makes a doc eligible to land here.

## The importer

`pnpm import-docs` fetches `src/lib/doc-sources.ts`'s pinned `DOC_SOURCES` list plus every entry
each `MANIFEST_REPOS` repo's own `docs/manifest.json` declares, gathers everything first, and
writes only if every fetch and every manifest entry validated cleanly — one failure (a 404, a bad
manifest entry, a path-traversal attempt, a `(section, slug)` collision between two different
sources) leaves `content/` untouched and exits non-zero, naming every failure. On a
clean run it also prunes anything under the collection root the effective source list no longer
claims. Set `GITHUB_TOKEN` to raise the commit-date lookup's rate limit above the unauthenticated
60/hour (CI sets it automatically). `pnpm test` exercises this against fake network/filesystem
deps — no real GitHub call is required to validate the importer's own logic.

## Design tokens

`src/styles/tokens.css` is a vendored, byte-identical copy of
`w6w-io/w6w-branding`'s `tokens/tokens.css`, guarded by `scripts/check-tokens.mjs`
(`pnpm check:tokens`). It is not `@import`ed across the filesystem because this repo's CI
checks out no sibling `branding` repo — see the file's own header.

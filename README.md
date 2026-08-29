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
```

## Content

- `src/content/docs/` — imported markdown, one file per source doc. **Entirely
  importer-owned**: the importer (landing in a later node) deletes anything here its source
  list doesn't claim. Never hand-author a page here.
- `src/content/site-docs/` — hand-authored pages this site writes itself (the `/` landing page
  today).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the `docs/` + `docs/manifest.json` convention
every source package repo follows, and what makes a doc eligible to land here.

## Design tokens

`src/styles/tokens.css` is a vendored, byte-identical copy of
`w6w-io/w6w-branding`'s `tokens/tokens.css`, guarded by `scripts/check-tokens.mjs`
(`pnpm check:tokens`). It is not `@import`ed across the filesystem because this repo's CI
checks out no sibling `branding` repo — see the file's own header.

# Contributing docs to docs.w6w.io

This is the one canonical description of the `docs/` + `docs/manifest.json` convention every
in-scope w6w package repo follows. Docs live in the SAME repo as the code they describe, next to
it, instead of being hand-copied into a separate docs repo — so a PR that changes behavior can
update the doc in the same commit. `docs.w6w.io` (this repo) pulls from each package repo's
`docs/` folder rather than owning the prose itself.

This file supersedes `packages/studio/docs/README.md`, which held this convention before it was
generalised here from "Studio" to "any w6w package repo"; that repo's copy is trimmed to a
pointer back at this file separately.

## Which repos this applies to

**In scope** — public, open-source repos whose `docs/` this site imports from: `core`, `ui`,
`wrappers`, `apps`, `studio`.

**Out of scope** — `server`, `admin` and `internal-apps` are internal-facing and are never
imported by this site, regardless of whether they carry a `docs/` folder or a `manifest.json`.

**A private repo's `docs/` cannot reach the public site, regardless of its manifest.** `studio`
is today's instance of that: its repo is currently private, so even though it is "in scope" by
the list above and follows this exact convention, nothing under its `docs/` is importable until
the repo itself is made public. Listing a doc in `manifest.json` is necessary but never
sufficient on its own — the containing repo's own visibility gates it first.

## Convention

- One `.md` file per doc. Use `.mdx` only if a page genuinely needs a live component — plain
  prose doesn't.
- Every file starts with frontmatter:
  ```md
  ---
  title: "Human-readable title"
  section: "guides"
  ---
  ```
  `section` groups docs in the site nav (e.g. `guides`, `reference`). Keep the list of sections
  in use small and consistent with what other packages' `docs/` folders use.
- **`manifest.json` is what actually ships.** A file in a package's `docs/` folder that isn't
  listed in that folder's `manifest.json` is not public — draft freely, add to the manifest when
  a doc is ready to publish. This keeps "what's external" an explicit, reviewable decision
  rather than "everything we happened to drop in this folder."

### The manifest entry schema

Each entry in a package's `docs/manifest.json`'s `docs` array carries exactly four keys,
mirroring the doc's own frontmatter:

| key       | meaning                                        |
| --------- | ----------------------------------------------- |
| `path`    | filename within `docs/`, e.g. `"embedding.md"` |
| `slug`    | the route segment this doc is imported under  |
| `section` | must match the frontmatter `section`           |
| `title`   | must match the frontmatter `title`             |

## Adding a doc

1. Copy [`templates/page.md`](./templates/page.md) to `docs/<slug>.md` and fill in its frontmatter
   and sections.
2. Add an entry to `docs/manifest.json`: `path`, `slug`, `section`, `title` (mirror the
   frontmatter).
3. Ship it in the same PR as the code change it documents.

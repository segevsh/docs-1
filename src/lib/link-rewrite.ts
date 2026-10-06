// Relative-link rewriting for collected pages (D-6) — STUB (S2 implements; signature pinned here).
//
// PURE: no filesystem, no git, no clock. `import-docs.ts` runs it after gathering (it needs the
// whole route map) and before the write phase; any returned error is an ordinary import failure
// (write-nothing posture unchanged).
//
// PINNED SIGNATURE
//
//   rewriteLinks(body: string, ctx: LinkContext): { body: string; errors: string[] }
//
// `body` is the page's frontmatter-stripped markdown. Handled targets: inline links `[t](x)`,
// images `![a](x)`, and reference-style definitions `[ref]: x`. Fenced code blocks and inline code
// spans are never touched. A target is rewritten only when it is RELATIVE: not a scheme URL
// (`https:`, `mailto:`…), not `/`-absolute, not a bare `#fragment`. A relative target is resolved
// against `ctx.file` (path under the source root, e.g. `core/rfcs/app.md`) and is then:
//
//   - a collected file (`ctx.routes` has it)  → `/<section>/<slug>/` + any `#fragment` kept
//   - uncollected, same repo, public repo     → `https://github.com/<ctx.sourceRepo>/blob/<ctx.sourceRefSha>/<path in repo>`
//   - uncollected, repo ∈ `PRIVATE_REPOS`     → error (never a GitHub URL)
//   - escapes its repo                        → error
//
// Repo identity is the PACKAGE DIR NAME — the first segment of a root-relative file path — never
// the remote slug. "Escapes its repo" = the normalized resolution leaves that first segment (a
// leading `..`, or lands in a different package dir). `<path in repo>` is the resolved path with
// that first segment removed. Every error names `ctx.file` and the offending target.

export interface LinkRoute {
  section: string;
  slug: string;
}

export interface LinkContext {
  /** The page's source file, path under the source root (`DocSource.file`). */
  file: string;
  /** Every collected file (path under the source root) → its route. */
  routes: ReadonlyMap<string, LinkRoute>;
  /** `owner/name` of the repo `file` lives in (`Provenance.sourceRepo`). */
  sourceRepo: string;
  /** The repo's HEAD commit (`Provenance.sourceRefSha`). */
  sourceRefSha: string;
}

export interface LinkRewriteResult {
  body: string;
  errors: string[];
}

export function rewriteLinks(_body: string, _ctx: LinkContext): LinkRewriteResult {
  throw new Error("rewriteLinks: not implemented (slice S2)");
}

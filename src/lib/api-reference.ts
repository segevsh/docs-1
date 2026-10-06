// The generated `reference-api/http-api` page — STUB (S3 implements; signature pinned here).
//
// PURE: no filesystem, no git, no clock. `import-docs.ts` reads `<root>/wrappers/endpoints.json`
// (absent → the page is skipped, not a failure), hands the raw text to `renderHttpApi`, and stamps
// frontmatter with `renderDocFile` using `GENERATED_HTTP_API` as the source and the wrappers repo's
// provenance (`syncedAt` = `endpoints.json`'s last commit).
//
// PINNED SIGNATURE
//
//   renderHttpApi(rawJson: string): { body: string } | { error: string }
//
// `{ error }` for unparseable / wrongly-shaped JSON (an import failure). Otherwise `body` is the
// page's markdown, DETERMINISTIC bytes (no clock, stable order): one entry per op with
// `serverImplemented !== false`, showing name, method, `basePath`+`path`, summary, params
// (name/in/type/required), returns, and naming (ts/python/cli). It NEVER emits `notes`,
// `$comment`, `serverImplemented` or `outOfScope` — they carry internal decision ids.

import type { DocSource } from "./doc-sources.ts";

/** Path of the contract file under the source root. */
export const ENDPOINTS_FILE = "wrappers/endpoints.json";

/** The one source that has no manifest entry. `file` is the contract it is generated from. */
export const GENERATED_HTTP_API: DocSource = {
  file: ENDPOINTS_FILE,
  section: "reference-api",
  slug: "http-api",
  title: "HTTP API",
  order: 0,
  position: 0,
  summary: null,
  origin: "root",
};

export function renderHttpApi(_rawJson: string): { body: string } | { error: string } {
  throw new Error("renderHttpApi: not implemented (slice S3)");
}

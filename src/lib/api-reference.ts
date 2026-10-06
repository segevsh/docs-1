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

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Markdown-table-cell safe: one line, pipes escaped. */
const cell = (v: string): string => v.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|");
const code = (v: string): string => "`" + v.replace(/`/g, "'") + "`";

export function renderHttpApi(rawJson: string): { body: string } | { error: string } {
  let doc: unknown;
  try {
    doc = JSON.parse(rawJson);
  } catch (e) {
    return { error: `${ENDPOINTS_FILE}: not valid JSON (${(e as Error).message})` };
  }
  if (!isObj(doc) || !Array.isArray(doc.operations)) {
    return { error: `${ENDPOINTS_FILE}: expected an object with an "operations" array` };
  }
  const basePath = str(doc.basePath);
  const out: string[] = [
    "Every operation the w6w HTTP API exposes to its client libraries. " +
      "Each entry shows the route, its parameters and what it returns, with the call as " +
      "spelled in the TypeScript and Python clients and the CLI.",
    "",
  ];
  let n = 0;
  for (const raw of doc.operations) {
    if (!isObj(raw)) return { error: `${ENDPOINTS_FILE}: operations[${n}] is not an object` };
    if (raw.serverImplemented === false) continue;
    const name = str(raw.name), method = str(raw.method), path = str(raw.path);
    if (!name || !method || !path) {
      return { error: `${ENDPOINTS_FILE}: operations[${n}] needs name, method and path` };
    }
    n++;
    out.push(`## ${name}`, "", `${code(`${method} ${basePath}${path}`)}`, "");
    const summary = str(raw.summary);
    if (summary) out.push(summary, "");
    const params = Array.isArray(raw.params) ? raw.params.filter(isObj) : [];
    if (params.length) {
      out.push("| Parameter | In | Type | Required |", "|---|---|---|---|");
      for (const p of params) {
        out.push(
          `| ${code(cell(str(p.name)))} | ${cell(str(p.in))} | ${cell(str(p.type))} | ${
            p.required === true ? "yes" : "no"
          } |`,
        );
      }
      out.push("");
    }
    const returns = str(raw.returns);
    if (returns) out.push(`**Returns:** ${code(returns)}`, "");
    const naming = isObj(raw.naming) ? raw.naming : {};
    const names: [string, string][] = [["TypeScript", "ts"], ["Python", "python"], ["CLI", "cli"]];
    const lines = names.filter(([, k]) => str(naming[k])).map(([l, k]) =>
      `- ${l}: ${code(str(naming[k]))}`
    );
    if (lines.length) out.push(...lines, "");
  }
  return { body: out.join("\n").replace(/\n+$/, "\n") };
}

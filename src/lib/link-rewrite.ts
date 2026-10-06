// Relative-link rewriting for collected pages (D-6) (S2).
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
//
// Decisions beyond the pin (each has a test):
//   - The repo check runs BEFORE the route lookup: a link that leaves its own package dir fails
//     even if the destination is collected (cross-repo links are written as site routes, D-6).
//   - The path is percent-decoded and `\` is read as `/` before resolving, so `%2e%2e/` and
//     `..\` cannot smuggle an escape past the check. Undecodable → error.
//   - A `?query` is dropped; a `#fragment` is kept (route and blob URL alike).
//   - A link to the repo root itself (empty path in repo) becomes `https://github.com/<repo>/tree/<sha>`.
//   - Footnote definitions (`[^1]: text`) are not link definitions. Raw HTML (`<a href>`,
//     `<img src>`) and autolinks are not handled — markdown targets only.
//   - Code spans are matched per paragraph (blank-line separated); a fenced block is any
//     ``` / ~~~ run opened at any indent and closed by the same char, >= as long; unclosed runs to EOF.

import { posix } from "node:path";

import { PRIVATE_REPOS } from "./doc-sources.ts";

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


const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})(.*)$/;
const REFDEF_RE = /^ {0,3}\[(?!\^)(?:[^\]\\\n]|\\.)+\]:[ \t]*(<[^>\n]*>|[^\s<]\S*)/gm;

interface Edit {
  start: number;
  end: number;
  text: string;
}

/** Rewrite every relative link target in `body` per the header's arms. */
export function rewriteLinks(body: string, ctx: LinkContext): LinkRewriteResult {
  const errors: string[] = [];
  const lines = body.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let fence: { ch: string; len: number } | null = null;

  const flush = () => {
    if (para.length > 0) out.push(processParagraph(para.join("\n"), ctx, errors));
    para = [];
  };

  for (const line of lines) {
    if (fence) {
      out.push(line);
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
      continue;
    }
    const open = FENCE_OPEN_RE.exec(line);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      flush();
      fence = { ch: open[1][0], len: open[1].length };
      out.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      out.push(line);
      continue;
    }
    para.push(line);
  }
  flush();
  return { body: out.join("\n"), errors };
}

/** Inline-code-span ranges `[start, end)` (delimiters included) in one paragraph. */
function codeSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text[i] !== "`") {
      i++;
      continue;
    }
    let n = 1;
    while (text[i + n] === "`") n++;
    // Find the next run of exactly `n` backticks.
    let j = i + n;
    let close = -1;
    while (j < text.length) {
      if (text[j] !== "`") {
        j++;
        continue;
      }
      let m = 1;
      while (text[j + m] === "`") m++;
      if (m === n) {
        close = j + m;
        break;
      }
      j += m;
    }
    if (close === -1) {
      i += n; // unmatched run: literal backticks
    } else {
      spans.push([i, close]);
      i = close;
    }
  }
  return spans;
}

/** Destination at `i` (just after `(` or `]:`): its source range and its raw value. */
function parseDest(text: string, i: number): { start: number; end: number; raw: string } | null {
  while (/[ \t\r\n]/.test(text[i] ?? "x")) i++;
  if (i >= text.length) return null;
  if (text[i] === "<") {
    const close = text.indexOf(">", i);
    const nl = text.indexOf("\n", i);
    if (close === -1 || (nl !== -1 && nl < close)) return null;
    return { start: i + 1, end: close, raw: text.slice(i + 1, close) };
  }
  let j = i;
  let depth = 0;
  while (j < text.length) {
    const c = text[j];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") break;
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      if (depth === 0) break;
      depth--;
    }
    j++;
  }
  if (j === i) return null;
  return { start: i, end: j, raw: text.slice(i, j) };
}

function processParagraph(text: string, ctx: LinkContext, errors: string[]): string {
  const spans = codeSpans(text);
  const inSpan = (pos: number) => spans.some(([a, b]) => pos >= a && pos < b);
  const edits: Edit[] = [];

  const consider = (dest: { start: number; end: number; raw: string } | null) => {
    if (!dest || inSpan(dest.start)) return;
    const r = resolveTarget(dest.raw, ctx);
    if (r === null) return;
    if (r.error) errors.push(r.error);
    else edits.push({ start: dest.start, end: dest.end, text: r.url as string });
  };

  // Reference-style definitions: `[ref]: target` at the start of a line.
  for (const m of text.matchAll(REFDEF_RE)) {
    if (inSpan(m.index as number)) continue;
    const dest = parseDest(text, (m.index as number) + m[0].length - m[1].length);
    consider(dest);
  }
  // Inline links and images: every `](` not backslash-escaped (`consider` skips a destination
  // inside a code span; a `](` inside a span always has its destination start inside it too).
  let at = text.indexOf("](");
  while (at !== -1) {
    if (text[at - 1] !== "\\") consider(parseDest(text, at + 2));
    at = text.indexOf("](", at + 2);
  }

  edits.sort((a, b) => b.start - a.start);
  let result = text;
  let floor = Infinity;
  for (const e of edits) {
    if (e.end > floor) continue; // overlapping candidate: keep the later-starting one
    result = result.slice(0, e.start) + e.text + result.slice(e.end);
    floor = e.start;
  }
  return result;
}

/** `null` = leave untouched; else the rewritten URL or an error naming the page and the target. */
function resolveTarget(
  raw: string,
  ctx: LinkContext,
): { url?: string; error?: string } | null {
  const target = raw.trim();
  if (target === "" || target.startsWith("#") || target.startsWith("/") || SCHEME_RE.test(target)) {
    return null;
  }
  const fail = (why: string) => ({ error: `${ctx.file}: link "${raw}" ${why}` });

  const hashAt = target.indexOf("#");
  const frag = hashAt === -1 ? "" : target.slice(hashAt);
  let path = hashAt === -1 ? target : target.slice(0, hashAt);
  const q = path.indexOf("?");
  if (q !== -1) path = path.slice(0, q);
  if (path === "") return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return fail("has an undecodable percent-escape");
  }
  path = path.replaceAll("\\", "/");
  if (path.startsWith("/")) return fail("resolves to an absolute path");

  const repo = ctx.file.split("/")[0];
  const resolved = posix.normalize(posix.join(posix.dirname(ctx.file), path));
  const first = resolved.split("/")[0];
  if (first === ".." || first !== repo) {
    return fail(`escapes its repo "${repo}" (resolves to "${resolved}")`);
  }

  const route = ctx.routes.get(resolved);
  if (route) return { url: `/${route.section}/${route.slug}/${frag}` };

  if (PRIVATE_REPOS.includes(repo)) {
    return fail(`points at "${resolved}", which is not published, and "${repo}" is a private repo`);
  }
  const inRepo = resolved.slice(repo.length + 1);
  const base = `https://github.com/${ctx.sourceRepo}`;
  if (inRepo === "") return { url: `${base}/tree/${ctx.sourceRefSha}${frag}` };
  const enc = inRepo.split("/").map(encodeURIComponent).join("/");
  return { url: `${base}/blob/${ctx.sourceRefSha}/${enc}${frag}` };
}

// Run: node --test src/lib/__tests__/link-rewrite.test.ts   (pure: no filesystem, no git, no clock)
//
// One named test per arm of the link-rewriting rule (D-6): collected → site route, uncollected
// same-repo public → GitHub blob at `sourceRefSha`, private repo → failure, escaping the repo →
// failure, plus the syntax surface (inline, image, reference definition) and the "left alone"
// surface (fenced/inline code, absolute, scheme, bare `#`).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type LinkContext, rewriteLinks } from "../link-rewrite.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";

function ctx(file: string, collected: Record<string, [string, string]> = {}, repo = "w6w-io/w6w-core"): LinkContext {
  return {
    file,
    routes: new Map(Object.entries(collected).map(([k, [section, slug]]) => [k, { section, slug }])),
    sourceRepo: repo,
    sourceRefSha: SHA,
  };
}

const CORE = ctx("core/rfcs/app.md", {
  "core/rfcs/workflow.md": ["reference-spec", "workflow"],
  "core/README.md": ["concepts", "overview"],
});

function ok(body: string, c: LinkContext = CORE): string {
  const r = rewriteLinks(body, c);
  assert.deepEqual(r.errors, []);
  return r.body;
}

describe("collected target → /<section>/<slug>/", () => {
  it("rewrites an inline link and keeps the fragment", () => {
    assert.equal(ok("See [wf](workflow.md#steps)."), "See [wf](/reference-spec/workflow/#steps).");
  });
  it("resolves ../ against the page's own directory", () => {
    assert.equal(ok("[o](../README.md)"), "[o](/concepts/overview/)");
  });
  it("rewrites a collected nested slug", () => {
    const c = ctx("studio/docs/a.md", { "studio/docs/b.md": ["guides", "workflows/triggers"] }, "w6w-io/w6w-studio");
    assert.equal(ok("[b](b.md)", c), "[b](/guides/workflows/triggers/)");
  });
  it("collected wins over the public-blob arm", () => {
    assert.ok(!ok("[wf](./workflow.md)").includes("github.com"));
  });
});

describe("uncollected same-repo public → GitHub blob at sourceRefSha", () => {
  it("builds the blob URL from the repo-relative path, not the package dir", () => {
    assert.equal(
      ok("[s](../src/schema.json)"),
      `[s](https://github.com/w6w-io/w6w-core/blob/${SHA}/src/schema.json)`,
    );
  });
  it("keeps the fragment on a blob URL", () => {
    assert.equal(ok("[l](other.md#L10)"), `[l](https://github.com/w6w-io/w6w-core/blob/${SHA}/rfcs/other.md#L10)`);
  });
  it("drops a ?query and percent-encodes path segments", () => {
    assert.equal(
      ok("[x](my%20file.md?raw=1)"),
      `[x](https://github.com/w6w-io/w6w-core/blob/${SHA}/rfcs/my%20file.md)`,
    );
  });
  it("a link to the repo root becomes a tree URL", () => {
    assert.equal(ok("[r](..)"), `[r](https://github.com/w6w-io/w6w-core/tree/${SHA})`);
  });
});

describe("uncollected in a private repo → failure", () => {
  for (const repo of ["server", "studio", "control", "admin"]) {
    it(`${repo}: an uncollected target fails, naming the page and the target, and is left unchanged`, () => {
      const c = ctx(`${repo}/docs/a.md`, {}, `w6w-io/w6w-${repo}`);
      const r = rewriteLinks("[x](../src/secret.ts)", c);
      assert.equal(r.errors.length, 1);
      assert.match(r.errors[0], new RegExp(`${repo}/docs/a\\.md`));
      assert.match(r.errors[0], /\.\.\/src\/secret\.ts/);
      assert.equal(r.body, "[x](../src/secret.ts)");
      assert.ok(!r.body.includes("github.com"));
    });
  }
  it("a COLLECTED target in a private repo still rewrites", () => {
    const c = ctx("server/docs/a.md", { "server/docs/b.md": ["guides", "b"] }, "w6w-io/w6w-server");
    assert.equal(ok("[b](b.md)", c), "[b](/guides/b/)");
  });
  it("identity is the package dir, not the remote slug", () => {
    // a public package whose remote slug says "server" is NOT private; a private dir with a public-looking slug IS.
    assert.deepEqual(rewriteLinks("[x](nope.md)", ctx("core/rfcs/a.md", {}, "w6w-io/w6w-server")).errors, []);
    assert.equal(rewriteLinks("[x](nope.md)", ctx("server/docs/a.md", {}, "w6w-io/w6w-core")).errors.length, 1);
  });
});

describe("escaping the repo → failure", () => {
  it("a leading .. past the package dir fails", () => {
    const r = rewriteLinks("[x](../../../etc/passwd)", CORE);
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0], /core\/rfcs\/app\.md/);
    assert.match(r.errors[0], /escapes/);
  });
  it("landing in a sibling package dir fails", () => {
    assert.equal(rewriteLinks("[x](../../server/docs/x.md)", CORE).errors.length, 1);
  });
  it("fails even when the sibling destination is collected", () => {
    const c = ctx("core/rfcs/app.md", { "server/docs/x.md": ["guides", "x"] });
    const r = rewriteLinks("[x](../../server/docs/x.md)", c);
    assert.equal(r.errors.length, 1);
    assert.equal(r.body, "[x](../../server/docs/x.md)");
  });
  it("a percent-encoded or backslash escape does not slip through", () => {
    assert.equal(rewriteLinks("[x](%2e%2e/%2e%2e/%2e%2e/x.md)", CORE).errors.length, 1);
    assert.equal(rewriteLinks("[x](..\\..\\..\\x.md)", CORE).errors.length, 1);
  });
  it("an undecodable percent-escape fails rather than passing through", () => {
    assert.equal(rewriteLinks("[x](%E0%A4%A.md)", CORE).errors.length, 1);
  });
  it("a path that stays inside the repo after .. is fine", () => {
    assert.equal(ok("[x](../rfcs/../rfcs/workflow.md)"), "[x](/reference-spec/workflow/)");
  });
});

describe("syntax surface: inline links, images, reference definitions", () => {
  it("rewrites an image target", () => {
    assert.equal(ok("![d](img/d.png)"), `![d](https://github.com/w6w-io/w6w-core/blob/${SHA}/rfcs/img/d.png)`);
  });
  it("rewrites an image nested in a link", () => {
    assert.equal(
      ok("[![d](img/d.png)](workflow.md)"),
      `[![d](https://github.com/w6w-io/w6w-core/blob/${SHA}/rfcs/img/d.png)](/reference-spec/workflow/)`,
    );
  });
  it("rewrites a reference-style definition, keeping the label and title", () => {
    assert.equal(ok('[wf]: workflow.md#a "Title"'), '[wf]: /reference-spec/workflow/#a "Title"');
  });
  it("a refdef into a private repo fails", () => {
    const c = ctx("studio/docs/a.md", {}, "w6w-io/w6w-studio");
    assert.equal(rewriteLinks("[x]: ../src/y.ts", c).errors.length, 1);
  });
  it("a footnote definition is not a link definition", () => {
    assert.equal(ok("[^1]: see some text here"), "[^1]: see some text here");
  });
  it("keeps an inline link's title and handles <angle> and parenthesised targets", () => {
    assert.equal(ok('[a](workflow.md "t")'), '[a](/reference-spec/workflow/ "t")');
    assert.equal(ok("[a](<workflow.md>)"), "[a](</reference-spec/workflow/>)");
    assert.equal(
      ok("[a](x(1).md)"),
      `[a](https://github.com/w6w-io/w6w-core/blob/${SHA}/rfcs/x(1).md)`,
    );
  });
  it("rewrites several links on one line and across lines, reporting each failure", () => {
    const body = "[a](workflow.md) and [b](../../../x) and\n[c](../README.md)";
    const r = rewriteLinks(body, CORE);
    assert.equal(r.errors.length, 1);
    assert.equal(r.body, "[a](/reference-spec/workflow/) and [b](../../../x) and\n[c](/concepts/overview/)");
  });
});

describe("code is never touched", () => {
  it("fenced block (backtick and tilde) with a would-be failing link", () => {
    const body = "```md\n[x](../../../etc/passwd)\n[y]: workflow.md\n```\n\n~~~\n[z](workflow.md)\n~~~";
    const r = rewriteLinks(body, CORE);
    assert.deepEqual(r.errors, []);
    assert.equal(r.body, body);
  });
  it("a longer fence is not closed by a shorter run; unclosed runs to EOF", () => {
    const body = "````\n```\n[x](workflow.md)\n````\n[y](workflow.md)";
    assert.equal(ok(body), "````\n```\n[x](workflow.md)\n````\n[y](/reference-spec/workflow/)");
    const unclosed = "```\n[x](workflow.md)";
    assert.equal(ok(unclosed), unclosed);
  });
  it("links after a closed fence are rewritten again", () => {
    assert.equal(ok("```\n[x](a.md)\n```\n[y](workflow.md)"), "```\n[x](a.md)\n```\n[y](/reference-spec/workflow/)");
  });
  it("inline code span (single, double, multi-line) is untouched", () => {
    const body = "`[x](workflow.md)` and ``a ` [y](workflow.md) `` and `[z](\nworkflow.md)`";
    assert.equal(ok(body), body);
  });
  it("a link whose text contains code is still rewritten; an escaped backtick is not a span", () => {
    assert.equal(ok("[`wf`](workflow.md)"), "[`wf`](/reference-spec/workflow/)");
    assert.equal(ok("\\` [y](workflow.md) \\`"), "\\` [y](/reference-spec/workflow/) \\`");
  });
  it("a backtick run that never closes in its paragraph does not hide later links", () => {
    assert.equal(ok("a ` b\n\n[y](workflow.md)"), "a ` b\n\n[y](/reference-spec/workflow/)");
  });
});

describe("targets that are left alone", () => {
  it("absolute, scheme, protocol-relative, mailto, bare # and empty targets", () => {
    const body = [
      "[a](/studio/x/)",
      "[b](https://example.com/a.md)",
      "[c](//cdn.example.com/a.md)",
      "[d](mailto:a@b.c)",
      "[e](#section)",
      "[f]()",
      "[g]: https://example.com/",
    ].join("\n");
    assert.equal(ok(body), body);
  });
  it("is deterministic and idempotent on already-rewritten output", () => {
    const once = ok("[a](workflow.md) [b](other.md)");
    assert.equal(ok(once), once);
    assert.equal(ok("[a](workflow.md) [b](other.md)"), once);
  });
  it("a CRLF reference definition does not carry the \\r into the target", () => {
    assert.equal(ok("[a]: workflow.md\r\n"), "[a]: /reference-spec/workflow/\r\n");
  });
  it("a body with no links is returned byte-for-byte, CRLF included", () => {
    const body = "# T\r\n\r\ntext\r\n";
    assert.equal(ok(body), body);
  });
});

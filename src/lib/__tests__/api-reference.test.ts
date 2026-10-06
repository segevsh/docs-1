import assert from "node:assert/strict";
import { test } from "node:test";
import { GENERATED_HTTP_API, renderHttpApi } from "../api-reference.ts";

const doc = {
  $comment: "SECRET-COMMENT",
  basePath: "/v1",
  outOfScope: ["OUT-OF-SCOPE-ID"],
  operations: [
    {
      name: "me",
      summary: "Caller identity.",
      method: "GET",
      path: "/auth/me",
      serverImplemented: "partial",
      params: [],
      returns: "Me",
      naming: { ts: "client.me()", python: "client.me()", cli: "w6w me" },
      notes: "NOTES-D15",
    },
    {
      name: "run",
      summary: "Run a thing.",
      method: "POST",
      path: "/run/{id}",
      serverImplemented: true,
      params: [
        { name: "id", in: "path", type: "string", required: true, $comment: "PARAM-COMMENT" },
        { name: "wait", in: "query", type: "a|b", required: false },
      ],
      returns: "RunResult",
      naming: { ts: "client.run()", python: "client.run()", cli: "w6w run" },
      notes: "NOTES-2",
    },
    {
      name: "ghost",
      summary: "Not built.",
      method: "GET",
      path: "/ghost",
      serverImplemented: false,
      params: [],
      returns: "X",
      naming: { ts: "a", python: "b", cli: "c" },
    },
  ],
};
const raw = JSON.stringify(doc);
const ok = (r: ReturnType<typeof renderHttpApi>): string => {
  assert.ok("body" in r, JSON.stringify(r));
  return r.body;
};

test("renders implemented ops with route, params, returns, naming", () => {
  const b = ok(renderHttpApi(raw));
  assert.match(b, /^## me$/m);
  assert.match(b, /`GET \/v1\/auth\/me`/);
  assert.match(b, /Caller identity\./);
  assert.match(b, /\| `id` \| path \| string \| yes \|/);
  assert.match(b, /\| `wait` \| query \| a\\\|b \| no \|/);
  assert.match(b, /\*\*Returns:\*\* `RunResult`/);
  assert.match(b, /- TypeScript: `client\.run\(\)`/);
  assert.match(b, /- CLI: `w6w run`/);
});

test("skips serverImplemented:false; keeps true and partial", () => {
  const b = ok(renderHttpApi(raw));
  assert.doesNotMatch(b, /ghost/);
  assert.match(b, /^## run$/m);
  assert.match(b, /^## me$/m);
});

test("never emits notes, $comment, serverImplemented or outOfScope", () => {
  const b = ok(renderHttpApi(raw));
  for (const w of ["NOTES", "COMMENT", "OUT-OF-SCOPE", "serverImplemented", "outOfScope", "D15"]) {
    assert.ok(!b.includes(w), w);
  }
});

test("deterministic bytes", () => {
  assert.equal(ok(renderHttpApi(raw)), ok(renderHttpApi(JSON.stringify(doc, null, 2))));
  assert.ok(ok(renderHttpApi(raw)).endsWith("\n"));
});

test("unparseable or wrongly shaped JSON is an error", () => {
  assert.ok("error" in renderHttpApi("{nope"));
  assert.ok("error" in renderHttpApi("[]"));
  assert.ok("error" in renderHttpApi('{"operations":{}}'));
  assert.ok("error" in renderHttpApi('{"operations":[{"name":"x"}]}'));
});

test("generated source identity", () => {
  assert.equal(GENERATED_HTTP_API.section, "reference-api");
  assert.equal(GENERATED_HTTP_API.slug, "http-api");
});

test("real endpoints.json when present: 30 of 36 ops, no leakage", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const p = new URL("../../../../wrappers/endpoints.json", import.meta.url);
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  const all = JSON.parse(text).operations as { serverImplemented: unknown }[];
  const b = ok(renderHttpApi(text));
  assert.equal(
    (b.match(/^## /gm) ?? []).length,
    all.filter((o) => o.serverImplemented !== false).length,
  );
  assert.doesNotMatch(b, /serverImplemented|\$comment|outOfScope/);
});

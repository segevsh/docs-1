import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createMarkdownProcessor, parseFrontmatter } from "@astrojs/markdown-remark";

import { CHANNELS } from "../channels.ts";
import { selectChannel } from "../channel-select.ts";
import remarkChannels from "../remark-channels.ts";

/**
 * Renders a fixture through the SAME pipeline `astro.config.mjs` registers
 * (`createMarkdownProcessor` from `@astrojs/markdown-remark`, an existing
 * dependency — no `unified`/`remark` package is added for this suite), with
 * `remarkChannels` wired in exactly like the real build. Frontmatter is
 * stripped with `parseFrontmatter` (also already a dependency) the same way
 * Astro's own content-collection loader does before handing the body to the
 * markdown processor — `bogus-tag.md` carries frontmatter because G3 also
 * copies it straight into `src/content/site-docs/`, where the `siteDocs`
 * schema requires `title`/`description`.
 */
const FIXTURES_DIR = fileURLToPath(new URL("./fixtures/", import.meta.url));

function readFixture(name: string): string {
  const raw = readFileSync(`${FIXTURES_DIR}${name}`, "utf8");
  return parseFrontmatter(raw).content;
}

async function renderFixture(name: string, withPlugin: boolean): Promise<string> {
  const processor = await createMarkdownProcessor({
    remarkPlugins: withPlugin ? [remarkChannels] : [],
  });
  const result = await processor.render(readFixture(name));
  return result.code;
}

async function assertRejectsWithMessage(fn: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  await assert.rejects(fn, (err: Error) => {
    assert.match(err.message, pattern);
    return true;
  });
}

test("all six channel tags produce six data-channel containers, including sdk-react", async () => {
  const html = await renderFixture("all-six.md", true);
  const found = [...html.matchAll(/data-channel="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(found.sort(), [...CHANNELS].sort());
  assert.ok(found.includes("sdk-react"), "sdk-react must produce its own container (decision #3)");
});

test("marker text does not survive anywhere in the rendered output", async () => {
  const html = await renderFixture("all-six.md", true);
  assert.equal(html.includes("{%"), false, "no opening or closing marker literal may survive");
});

test("an unknown tag {% bogus %} throws, and the message names bogus", async () => {
  await assertRejectsWithMessage(() => renderFixture("bogus-tag.md", true), /bogus/);
});

test("an unclosed {% webui %} throws", async () => {
  await assertRejectsWithMessage(() => renderFixture("unclosed.md", true), /webui/);
});

test("a stray {% endcli %} with no opener throws", async () => {
  await assertRejectsWithMessage(() => renderFixture("stray-end.md", true), /cli/);
});

test("nested {% webui %}{% webui %} of the same channel throws", async () => {
  await assertRejectsWithMessage(() => renderFixture("nested-same.md", true), /webui/);
});

test("a marker inside a code fence is left as literal text, not a container", async () => {
  const html = await renderFixture("code-fence.md", true);
  assert.ok(html.includes("{% webui %}"), "the fenced marker text must survive verbatim");
  assert.equal(html.includes("data-channel"), false, "a fenced marker must not open a container");
});

test("a document with no markers renders identically with and without the plugin", async () => {
  const withPlugin = await renderFixture("no-markers.md", true);
  const withoutPlugin = await renderFixture("no-markers.md", false);
  assert.equal(withPlugin, withoutPlugin);
});

test("selectChannel returns the stored value when it is present", () => {
  assert.equal(selectChannel(["cli", "api"], "api"), "api");
});

test("selectChannel falls back to CHANNELS order, not the input order, when nothing stored matches", () => {
  // `present` is deliberately out of CHANNELS order (api, then webui) — the
  // fallback must still pick `webui` first, because that is CHANNELS[0]
  // among the two, not whichever came first in `present`.
  assert.equal(selectChannel(["api", "webui"], null), "webui");
  assert.equal(selectChannel(["api", "webui"], "sdk-node"), "webui");
});

test("selectChannel returns null when the page has no channel blocks", () => {
  assert.equal(selectChannel([], "webui"), null);
  assert.equal(selectChannel([], null), null);
});

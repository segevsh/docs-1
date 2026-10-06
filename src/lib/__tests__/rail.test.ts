// Run: node --test src/lib/__tests__/rail.test.ts   (pure — no Astro, no filesystem)
//
// Pins the docs rail's ordering and nesting rules (`buildRail`): sections in first-seen order,
// pages by `order` with unordered ones after (stable by `position`), sub-pages nested under their
// parent, and only the viewed page's section and parent expanded.

import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRail, sectionLanding } from "../rail.ts";
import type { RailEntry } from "../rail.ts";

function entry(id: string, order: number | null = null, position = 0): RailEntry {
  const segments = id.split("/");
  return { id, data: { section: segments[0], title: segments.slice(1).join(" / "), order, position } };
}

const titles = (items: Array<{ title: string }>) => items.map((i) => i.title);

test("areas come out in the pinned order with titles, never raw slugs", () => {
  const rail = buildRail([
    entry("reference-spec/a"),
    entry("self-hosting/a"),
    entry("guides/a"),
    entry("get-started/a"),
    entry("build-apps/a"),
    entry("clients/a"),
  ]);
  assert.deepEqual(rail.map((a) => a.id), ["get-started", "guides", "clients", "self-hosting", "build-apps", "reference"]);
  assert.deepEqual(rail.map((a) => a.title), ["Get started", "Guides", "Clients", "Self-hosting", "Build apps", "Reference"]);
});

test("Reference is one area holding three titled sub-groups in SECTIONS order", () => {
  const rail = buildRail([entry("reference-packages/a"), entry("reference-api/a"), entry("reference-spec/a")]);
  assert.equal(rail.length, 1);
  assert.deepEqual(rail[0].groups.map((g) => g.title), ["Specification", "HTTP API & MCP", "Packages"]);
  assert.deepEqual(rail[0].groups.map((g) => g.section), ["reference-spec", "reference-api", "reference-packages"]);
});

test("an unknown section is dropped without crashing; an empty section yields no group", () => {
  const rail = buildRail([entry("bogus/a"), entry("guides/a")]);
  assert.deepEqual(rail.map((a) => a.id), ["guides"]);
  assert.equal(rail[0].groups.length, 1);
  assert.equal(buildRail([entry("reference-api/a")])[0].groups.length, 1);
  assert.deepEqual(buildRail([]), []);
});

test("Reference is open only when the viewed page is inside it", () => {
  const entries = [entry("guides/a"), entry("reference-api/b")];
  const onGuide = buildRail(entries, "guides/a");
  assert.equal(onGuide.find((a) => a.id === "reference")!.open, false);
  const onRef = buildRail(entries, "reference-api/b");
  assert.equal(onRef.find((a) => a.id === "reference")!.open, true);
  assert.equal(onRef.find((a) => a.id === "guides")!.open, false);
});

test("sectionLanding lists top-level pages in rail order; empty/unknown sections give null", () => {
  const entries = [entry("guides/b", 2), entry("guides/a", 1), entry("guides/a/child", 0), entry("bogus/x")];
  const landing = sectionLanding(entries, "guides")!;
  assert.equal(landing.title, "Guides");
  assert.deepEqual(landing.pages.map((p) => p.id), ["guides/a", "guides/b"]);
  assert.equal(sectionLanding(entries, "clients"), null);
  assert.equal(sectionLanding(entries, "bogus"), null);
});

test("top-level pages sort by order; unordered ones come after, by position", () => {
  const rail = buildRail([
    entry("guides/late", null, 0),
    entry("guides/second", 20, 5),
    entry("guides/first", 0, 9),
    entry("guides/later", null, 1),
  ]);
  assert.deepEqual(titles(rail[0].groups[0].items), ["first", "second", "late", "later"]);
});

test("equal order and position keep the collection's own order (stable)", () => {
  const rail = buildRail([entry("guides/b", 1, 0), entry("guides/a", 1, 0)]);
  assert.deepEqual(titles(rail[0].groups[0].items), ["b", "a"]);
});

test("entries with no order or position (legacy content) sort after every ordered one", () => {
  const legacy: RailEntry = { id: "guides/legacy", data: { section: "guides", title: "legacy" } };
  const rail = buildRail([legacy, entry("guides/ordered", 3, 0)]);
  assert.deepEqual(titles(rail[0].groups[0].items), ["ordered", "legacy"]);
});

test("sub-pages nest under their parent and sort among themselves the same way", () => {
  const rail = buildRail([
    entry("guides/workflows/triggers", 10, 2),
    entry("guides/overview", 0, 0),
    entry("guides/workflows", 40, 1),
    entry("guides/workflows/nodes", 5, 3),
    entry("guides/workflows/zz", null, 4),
  ]);
  const items = rail[0].groups[0].items;
  assert.deepEqual(titles(items), ["overview", "workflows"]);
  assert.deepEqual(titles(items[1].children), ["workflows / nodes", "workflows / triggers", "workflows / zz"]);
  assert.deepEqual(items[0].children, []);
});

test("a sub-page whose parent is absent still appears, at top level", () => {
  const rail = buildRail([entry("guides/workflows/triggers")]);
  assert.deepEqual(rail[0].groups[0].items.map((i) => i.id), ["guides/workflows/triggers"]);
});

test("viewing a sub-page expands its section and its parent; everything else stays collapsed", () => {
  const rail = buildRail(
    [
      entry("guides/workflows", 0),
      entry("guides/workflows/triggers", 0),
      entry("guides/connections", 1),
      entry("guides/connections/oauth", 0),
      entry("clients/core"),
    ],
    "guides/workflows/triggers",
  );
  const [guides, clients] = rail;
  assert.equal(guides.open, true);
  assert.equal(clients.open, false);
  const [workflows, connections] = guides.groups[0].items;
  assert.equal(workflows.open, true);
  assert.equal(workflows.active, false);
  assert.equal(workflows.children[0].active, true);
  assert.equal(connections.open, false);
});

test("viewing a parent page expands it and marks it active", () => {
  const rail = buildRail([entry("guides/workflows"), entry("guides/workflows/triggers")], "guides/workflows");
  assert.equal(rail[0].groups[0].items[0].active, true);
  assert.equal(rail[0].groups[0].items[0].open, true);
  assert.equal(rail[0].groups[0].items[0].children[0].active, false);
});

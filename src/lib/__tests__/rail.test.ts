// Run: node --test src/lib/__tests__/rail.test.ts   (pure — no Astro, no filesystem)
//
// Pins the docs rail's ordering and nesting rules (`buildRail`): sections in first-seen order,
// pages by `order` with unordered ones after (stable by `position`), sub-pages nested under their
// parent, and only the viewed page's section and parent expanded.

import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRail } from "../rail.ts";
import type { RailEntry } from "../rail.ts";

function entry(id: string, order: number | null = null, position = 0): RailEntry {
  const segments = id.split("/");
  return { id, data: { section: segments[0], title: segments.slice(1).join(" / "), order, position } };
}

const titles = (items: Array<{ title: string }>) => items.map((i) => i.title);

test("sections keep first-seen order", () => {
  const rail = buildRail([entry("studio/a"), entry("packages/core"), entry("studio/b")]);
  assert.deepEqual(rail.map((s) => s.section), ["studio", "packages"]);
});

test("top-level pages sort by order; unordered ones come after, by position", () => {
  const rail = buildRail([
    entry("studio/late", null, 0),
    entry("studio/second", 20, 5),
    entry("studio/first", 0, 9),
    entry("studio/later", null, 1),
  ]);
  assert.deepEqual(titles(rail[0].items), ["first", "second", "late", "later"]);
});

test("equal order and position keep the collection's own order (stable)", () => {
  const rail = buildRail([entry("studio/b", 1, 0), entry("studio/a", 1, 0)]);
  assert.deepEqual(titles(rail[0].items), ["b", "a"]);
});

test("entries with no order or position (legacy content) sort after every ordered one", () => {
  const legacy: RailEntry = { id: "studio/legacy", data: { section: "studio", title: "legacy" } };
  const rail = buildRail([legacy, entry("studio/ordered", 3, 0)]);
  assert.deepEqual(titles(rail[0].items), ["ordered", "legacy"]);
});

test("sub-pages nest under their parent and sort among themselves the same way", () => {
  const rail = buildRail([
    entry("studio/workflows/triggers", 10, 2),
    entry("studio/overview", 0, 0),
    entry("studio/workflows", 40, 1),
    entry("studio/workflows/nodes", 5, 3),
    entry("studio/workflows/zz", null, 4),
  ]);
  const items = rail[0].items;
  assert.deepEqual(titles(items), ["overview", "workflows"]);
  assert.deepEqual(titles(items[1].children), ["workflows / nodes", "workflows / triggers", "workflows / zz"]);
  assert.deepEqual(items[0].children, []);
});

test("a sub-page whose parent is absent still appears, at top level", () => {
  const rail = buildRail([entry("studio/workflows/triggers")]);
  assert.deepEqual(rail[0].items.map((i) => i.id), ["studio/workflows/triggers"]);
});

test("viewing a sub-page expands its section and its parent; everything else stays collapsed", () => {
  const rail = buildRail(
    [
      entry("studio/workflows", 0),
      entry("studio/workflows/triggers", 0),
      entry("studio/connections", 1),
      entry("studio/connections/oauth", 0),
      entry("packages/core"),
    ],
    "studio/workflows/triggers",
  );
  const [studio, packages] = rail;
  assert.equal(studio.open, true);
  assert.equal(packages.open, false);
  const [workflows, connections] = studio.items;
  assert.equal(workflows.open, true);
  assert.equal(workflows.active, false);
  assert.equal(workflows.children[0].active, true);
  assert.equal(connections.open, false);
});

test("viewing a parent page expands it and marks it active", () => {
  const rail = buildRail([entry("studio/workflows"), entry("studio/workflows/triggers")], "studio/workflows");
  assert.equal(rail[0].items[0].active, true);
  assert.equal(rail[0].items[0].open, true);
  assert.equal(rail[0].items[0].children[0].active, false);
});

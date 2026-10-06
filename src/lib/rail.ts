// The docs rail's shape, as a pure function of the `docs` + `siteDocs` entries — kept out of
// `DocLayout.astro` so its ordering and nesting rules are unit-testable (`rail.test.ts`).
//
// The rail is a list of AREAS in the pinned `AREAS` order (decisions D-1/D-6: the area map is a
// code const). An area holds one or more section groups, in `SECTIONS` order (never first-seen);
// Reference holds the three `reference-*` sections as titled sub-groups. A section absent from
// `SECTIONS` is dropped, a section with no pages yields no group, an area with no groups is
// omitted. Within a group, top-level pages sort by `order` ascending, entries with no `order`
// after every ordered one; ties keep their declared `position`, then the collection's own order —
// a stable sort. A sub-page (`<section>/<parent>/<child>`) nests under its parent the same way.

import { SECTIONS } from "./doc-sources.ts";

export const AREAS = [
  { id: "get-started", title: "Get started", sections: ["get-started"] },
  { id: "guides", title: "Guides", sections: ["guides"] },
  { id: "clients", title: "Clients", sections: ["clients"] },
  { id: "self-hosting", title: "Self-hosting", sections: ["self-hosting"] },
  { id: "build-apps", title: "Build apps", sections: ["build-apps"] },
  {
    id: "reference",
    title: "Reference",
    sections: ["reference-spec", "reference-api", "reference-packages"],
  },
] as const;

const SECTION_TITLES: Record<string, string> = {
  "get-started": "Get started",
  guides: "Guides",
  clients: "Clients",
  "self-hosting": "Self-hosting",
  "build-apps": "Build apps",
  "reference-spec": "Specification",
  "reference-api": "HTTP API & MCP",
  "reference-packages": "Packages",
};

/** The reader-facing title of a section (falls back to the raw id for an unknown one). */
export function sectionTitle(section: string): string {
  return SECTION_TITLES[section] ?? section;
}

export interface RailEntry {
  /** The collection id — `<section>/<slug>`, `<section>/<parent>/<child>` for a sub-page. */
  id: string;
  data: {
    section: string;
    title: string;
    order?: number | null;
    position?: number;
    summary?: string | null;
    description?: string | null;
  };
}

export interface RailItem {
  id: string;
  title: string;
  /** This page is the one being viewed. */
  active: boolean;
  /** This page or one of its sub-pages is being viewed — its sub-pages are shown. */
  open: boolean;
  children: RailItem[];
}

export interface RailGroup {
  section: string;
  /** Reader-facing group title (never the raw slug). */
  title: string;
  /** The page being viewed is somewhere in this group. */
  open: boolean;
  items: RailItem[];
}

export interface RailArea {
  id: string;
  title: string;
  /** The page being viewed is somewhere in this area (Reference renders collapsed otherwise). */
  open: boolean;
  groups: RailGroup[];
}

function compare(a: RailEntry, b: RailEntry): number {
  const ao = a.data.order ?? Number.POSITIVE_INFINITY;
  const bo = b.data.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  const ap = a.data.position ?? Number.POSITIVE_INFINITY;
  const bp = b.data.position ?? Number.POSITIVE_INFINITY;
  return ap === bp ? 0 : ap < bp ? -1 : 1;
}

/** `<section>/<parent>/<child>` → `<section>/<parent>`; anything shallower → `null`. */
function parentId(id: string): string | null {
  const segments = id.split("/");
  return segments.length === 3 ? segments.slice(0, 2).join("/") : null;
}

function buildGroup(
  section: string,
  sectionEntries: RailEntry[],
  ids: Set<string>,
  currentId?: string,
): RailGroup {
  const childrenOf = new Map<string, RailEntry[]>();
  const topLevel: RailEntry[] = [];
  for (const entry of sectionEntries) {
    const parent = parentId(entry.id);
    // A sub-page whose parent isn't in the collection (never produced by the importer, which
    // refuses an orphan) still gets a link — at top level — rather than vanishing.
    if (parent !== null && ids.has(parent)) {
      const list = childrenOf.get(parent) ?? [];
      list.push(entry);
      childrenOf.set(parent, list);
    } else {
      topLevel.push(entry);
    }
  }

  const item = (entry: RailEntry): RailItem => {
    const children = [...(childrenOf.get(entry.id) ?? [])].sort(compare).map(item);
    const active = entry.id === currentId;
    return {
      id: entry.id,
      title: entry.data.title,
      active,
      open: active || children.some((c) => c.active),
      children,
    };
  };

  const items = [...topLevel].sort(compare).map(item);
  return { section, title: sectionTitle(section), open: items.some((i) => i.open), items };
}

export function buildRail(entries: RailEntry[], currentId?: string): RailArea[] {
  const ids = new Set(entries.map((e) => e.id));
  const bySection = new Map<string, RailEntry[]>();
  for (const entry of entries) {
    if (!(SECTIONS as readonly string[]).includes(entry.data.section)) continue;
    const list = bySection.get(entry.data.section) ?? [];
    list.push(entry);
    bySection.set(entry.data.section, list);
  }

  const areas: RailArea[] = [];
  for (const area of AREAS) {
    const groups = SECTIONS.filter((s) => (area.sections as readonly string[]).includes(s))
      .filter((s) => bySection.has(s))
      .map((s) => buildGroup(s, bySection.get(s)!, ids, currentId));
    if (groups.length === 0) continue;
    areas.push({
      id: area.id,
      title: area.title,
      open: groups.some((g) => g.open),
      groups,
    });
  }
  return areas;
}

/** A section's landing-page content: its title and its top-level pages in rail order. */
export function sectionLanding(
  entries: RailEntry[],
  section: string,
): { section: string; title: string; pages: RailEntry[] } | null {
  const pages = entries.filter((e) => e.data.section === section && parentId(e.id) === null);
  if (!(SECTIONS as readonly string[]).includes(section) || pages.length === 0) return null;
  return { section, title: sectionTitle(section), pages: [...pages].sort(compare) };
}

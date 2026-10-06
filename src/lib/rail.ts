// The docs rail's shape, as a pure function of the `docs` collection — kept out of
// `DocLayout.astro` so its ordering and nesting rules are unit-testable (`rail.test.ts`).
//
// Sections appear in first-seen order. Within a section, top-level pages sort by `order`
// ascending, entries with no `order` after every ordered one; ties keep their declared
// `position` (the entry's index in the manifest or pinned list that declared it), then the
// collection's own order — a stable sort, so the rail never reshuffles between builds. A sub-page
// (`<section>/<parent>/<child>`) nests under its parent and sorts among its siblings the same way.

export interface RailEntry {
  /** The collection id — `<section>/<slug>`, `<section>/<parent>/<child>` for a sub-page. */
  id: string;
  data: {
    section: string;
    title: string;
    order?: number | null;
    position?: number;
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

export interface RailSection {
  section: string;
  /** The page being viewed is somewhere in this section. */
  open: boolean;
  items: RailItem[];
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

export function buildRail(entries: RailEntry[], currentId?: string): RailSection[] {
  const ids = new Set(entries.map((e) => e.id));
  const bySection = new Map<string, RailEntry[]>();
  for (const entry of entries) {
    const list = bySection.get(entry.data.section) ?? [];
    list.push(entry);
    bySection.set(entry.data.section, list);
  }

  return [...bySection].map(([section, sectionEntries]) => {
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
    return { section, open: items.some((i) => i.open), items };
  });
}

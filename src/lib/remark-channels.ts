import { CHANNELS, type Channel } from "./channels.ts";

/**
 * Turns each `{% <channel> %}` … `{% end<channel> %}` block into a single
 * container carrying `data-channel="<channel>"`, so the client-side toggle
 * (`../layouts/DocLayout.astro`'s `<script>`) can show one channel's content
 * at a time.
 *
 * Registered as `markdown.remarkPlugins: [remarkChannels]` in
 * `astro.config.mjs`, mirroring `packages/frontend/packages/web/src/lib/
 * remark-doc-links.ts`'s own registration shape and its reasoning for
 * `unknown`-typed parameters (see that module's header): a function
 * accepting `unknown` is assignable to Astro's `RemarkPlugin` transformer
 * type with no `unified`/`mdast` type dependency — this package deliberately
 * carries neither (`unist-util-visit`, `mdast-util-*`, `unified` and
 * `@types/mdast` are all out of scope for T3.1.1).
 *
 * HAND-ROLLED walk, same idiom as `remark-doc-links.ts`'s `forEachLink` and
 * `rehype-docs-a11y.ts`'s `walk`: a local, minimal node-shape interface
 * (`MdastNode` below) rather than an imported `mdast` type.
 *
 * Grammar (A2): a marker is recognised ONLY as a **block-level** paragraph
 * whose entire text content — nothing else — is `{% <channel> %}` or
 * `{% end<channel> %}`, on its own line (i.e. its own paragraph, separated
 * from surrounding content by a blank line, which is how CommonMark forms a
 * paragraph in the first place). A marker inside a sentence produces a
 * paragraph with more than one child, or a text child whose value is not
 * *exactly* the marker; a marker inside a fenced code block is a `code`
 * node, not a `paragraph`; a marker that is the sole content of an inline
 * code span (`` `{% webui %}` ``) is a paragraph whose only child is an
 * `inlineCode` node, not a `text` node — none of the three match, so all
 * three are left untouched as literal text.
 *
 * Scope note: only the DOCUMENT'S TOP-LEVEL block children are scanned (the
 * `root` node's own `children` array) — a marker paragraph nested inside a
 * list item or blockquote is not recognised. Nothing in T3.1.1's acceptance
 * requires nesting inside another container, and scanning one level keeps
 * the hand-rolled walk to the ~6-line shape the pinned decision calls for.
 */

interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MarkerMatch {
  kind: "open" | "close";
  /** The channel tag, without the `end` prefix on a close marker. */
  tag: string;
}

const MARKER_TEXT = /^\{%\s*([^%]+?)\s*%\}$/;

function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

/**
 * `null` means "not a channel marker, leave the node exactly as it is" —
 * either it isn't a lone-paragraph `{% … %}`, or its inner text isn't a
 * known open/close spelling at all (that last case is reported by the
 * caller, which has enough context to name the offending literal).
 */
function matchMarker(node: MdastNode): MarkerMatch | { kind: "unknown"; raw: string } | null {
  if (node.type !== "paragraph") return null;
  const children = node.children ?? [];
  if (children.length !== 1) return null;
  const only = children[0];
  if (only.type !== "text" || typeof only.value !== "string") return null;

  const text = only.value.trim();
  const match = MARKER_TEXT.exec(text);
  if (!match) return null;

  const inner = match[1].trim();
  if (isChannel(inner)) return { kind: "open", tag: inner };
  if (inner.startsWith("end")) {
    const candidate = inner.slice(3);
    if (isChannel(candidate)) return { kind: "close", tag: candidate };
  }
  return { kind: "unknown", raw: inner };
}

/**
 * Every hard-fail message this module has thrown during the current
 * process. `astro.config.mjs`'s `failBuildOnChannelErrors()` integration
 * reads this at its `astro:build:done` hook to turn what would otherwise be
 * a SWALLOWED content-collection render error into a real, non-zero `astro
 * build` exit — see that function's own header for the measured Astro
 * 5.18.2 platform gap this works around (the content-layer `glob()`
 * loader's `render()` call catches and merely logs a `remarkPlugins`
 * transformer's throw; it never rejects). A plain `throw` alone is still
 * what makes every other consumer of this module work correctly: the unit
 * suite's `assert.rejects` (`__tests__/channels.test.ts`), and a direct
 * `.md` page under `src/pages/`, which is NOT glob-loader-mediated and
 * fails `astro build` on its own already.
 */
export const channelErrors: string[] = [];

function failBuild(message: string): never {
  channelErrors.push(message);
  throw new Error(message);
}

function unrecognisedTagMessage(raw: string): string {
  return (
    `remark-channels: unrecognised channel tag "${raw}" in "{% ${raw} %}" — ` +
    `valid channels are: ${CHANNELS.join(", ")}.`
  );
}

/** One open channel block, being built up as top-level children are consumed. */
interface OpenBlock {
  tag: string;
  container: MdastNode;
}

function transformTopLevel(children: MdastNode[]): MdastNode[] {
  const out: MdastNode[] = [];
  let open: OpenBlock | null = null;

  for (const node of children) {
    const marker = matchMarker(node);

    if (marker === null) {
      // Not a marker paragraph — ordinary content, filed into whichever
      // container (if any) is currently open.
      if (open) {
        open.container.children!.push(node);
      } else {
        out.push(node);
      }
      continue;
    }

    if (marker.kind === "unknown") {
      failBuild(unrecognisedTagMessage(marker.raw));
    }

    if (marker.kind === "open") {
      if (open) {
        // Nesting — same channel or different, both a throw in v1. There is
        // no shape here that lets an inner block "resume" the outer one
        // once closed, so refusing outright is the only safe reading.
        failBuild(
          `remark-channels: "{% ${marker.tag} %}" opens while "{% ${open.tag} %}" is still ` +
            `open — nested channel blocks (same channel or different) are not supported in v1.`,
        );
      }
      open = {
        tag: marker.tag,
        container: {
          type: "blockquote",
          data: { hName: "div", hProperties: { "data-channel": marker.tag } },
          children: [],
        },
      };
      continue;
    }

    // marker.kind === "close"
    if (!open) {
      failBuild(
        `remark-channels: "{% end${marker.tag} %}" has no matching opening "{% ${marker.tag} %}" marker.`,
      );
    }
    if (open.tag !== marker.tag) {
      failBuild(
        `remark-channels: "{% end${marker.tag} %}" does not close the currently open ` +
          `"{% ${open.tag} %}" block.`,
      );
    }
    out.push(open.container);
    open = null;
  }

  if (open) {
    failBuild(`remark-channels: "{% ${open.tag} %}" has no matching "{% end${open.tag} %}" marker.`);
  }

  return out;
}

export default function remarkChannels() {
  return (tree: unknown, _file: unknown) => {
    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) return;
    root.children = transformTopLevel(root.children);
  };
}

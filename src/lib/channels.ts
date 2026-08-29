/**
 * The channel vocabulary — the single source of truth for the six tags the
 * `{% <channel> %}` … `{% end<channel> %}` grammar recognises (T3.1.1
 * decision #3, `logs/decisions.jsonl`). Every other module that needs to
 * know a channel name imports `CHANNELS`/`Channel` from here; the six
 * strings must appear as literals in exactly this one file.
 *
 * `sdk-react` is included because `@w6w/react` is a real, shipped,
 * npm-published wrapper lane (`.claude/docs/usage/partner/
 * partner-ui-embedding.md` treats it as equal to sdk/cli/python) —
 * retrofitting it later would touch every consumer; it costs nothing to add
 * now.
 *
 * Order is canonical: it is both the display order for the channel toggle
 * and the tie-break order `selectChannel` (`./channel-select.ts`) falls back
 * to when nothing is stored yet.
 */
export const CHANNELS = ["webui", "cli", "sdk-node", "sdk-python", "sdk-react", "api"] as const;

export type Channel = (typeof CHANNELS)[number];

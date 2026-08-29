import { CHANNELS } from "./channels.ts";

/**
 * Pure selection logic for the channel toggle — no DOM, no `localStorage`,
 * no clock, so it is testable without a browser (A8). The `.astro` layout's
 * `<script>` (`../layouts/DocLayout.astro`) calls this rather than
 * re-implementing the same three-way fallback inline.
 *
 * @param present - the channels actually present on the current page, in
 *   whatever order the caller found them.
 * @param stored - the previously-chosen channel read from `localStorage`
 *   (`null` if nothing has been chosen yet, or nothing is stored).
 * @returns `stored` if it is one of `present`; otherwise the first member of
 *   `CHANNELS` (its own canonical order — A1) that is in `present`;
 *   otherwise `null` (the page has no channel blocks at all).
 */
export function selectChannel(present: readonly string[], stored: string | null): string | null {
  if (stored !== null && present.includes(stored)) return stored;
  for (const channel of CHANNELS) {
    if (present.includes(channel)) return channel;
  }
  return null;
}

// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import remarkChannels, { channelErrors } from "./src/lib/remark-channels.ts";

/**
 * Astro config for docs.w6w.io — the public documentation site.
 *
 * Static output, no deploy adapter: deployed as a plain static build
 * (`dist/`), mirroring `packages/frontend/packages/web`'s own
 * `output: "static"` + no-adapter shape (`wrangler pages deploy dist`,
 * `deploy.yml:320-327`).
 */

/**
 * T3.1.1 (A4/A5) — makes an unrecognised or malformed `{% <channel> %}`
 * marker actually FAIL `astro build`, not just log a warning and keep
 * going.
 *
 * Measured 2026-08-29, Astro 5.18.2: the content-layer `glob()` loader's own
 * `render()` call wraps every entry's markdown render in
 * `try { … } catch (error) { logger.error(...) }`
 * (`node_modules/astro/dist/content/loaders/glob.js`), so
 * `remarkChannels`'s own `throw` is logged but never rejects — confirmed
 * even for an entry a page actually renders (`renderEntry`,
 * `node_modules/astro/dist/content/runtime.js`, treats a missing
 * `entry.rendered` as "render nothing", not an error to surface). The CLI's
 * own entrypoint (`node_modules/astro/astro.js`) then runs
 * `main().then(() => process.exit(0))` unconditionally once that swallowed
 * build "succeeds" — which overrides even a `process.exitCode` set from
 * inside the plugin (measured: still exits 0). An `astro:build:done` hook
 * runs INSIDE that same `build()` promise, before control ever returns to
 * the CLI's `.then()` — a real `process.exit(1)` called from here wins that
 * race outright. Same "fail loudly, never silently drop" posture as
 * `src/lib/remark-channels.ts`'s own header and `import-docs.ts`'s
 * gather-all/write-nothing (T3.1.2).
 */
function failBuildOnChannelErrors() {
  return {
    name: "fail-build-on-channel-errors",
    hooks: {
      "astro:build:done": () => {
        if (channelErrors.length === 0) return;
        console.error(
          `\n[remark-channels] astro build failed — ${channelErrors.length} channel-tag error(s):\n` +
            channelErrors.map((message) => `  - ${message}`).join("\n") +
            "\n",
        );
        process.exit(1);
      },
    },
  };
}

// When served behind the devcontainer's cloudflared tunnel (docs-${DEV_ID}.${TUNNEL_ZONE}),
// Vite must accept that Host header and run HMR over the public wss endpoint instead of
// localhost — same mechanism as frontend's astro.config.mjs. No-op for a plain local `pnpm dev`.
const PUBLIC_HOST = process.env.SITE_PUBLIC_HOST;

export default defineConfig({
  site: "https://docs.w6w.io",
  output: "static",
  integrations: [mdx(), failBuildOnChannelErrors()],
  markdown: {
    // T3.1.1's `{% <channel> %}` … `{% end<channel> %}` channel-tag plugin —
    // see `src/lib/remark-channels.ts` for the grammar and hard-fail rules.
    remarkPlugins: [remarkChannels],
    // Dual light/dark Shiki themes, matching `tokens.css`'s own
    // `:root:not([data-theme="light"])` / `@media (prefers-color-scheme: dark)`
    // blocks — the exact shape at
    // `packages/frontend/packages/web/astro.config.mjs:160-163`.
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  server: { host: true },
  vite: {
    server: {
      allowedHosts: PUBLIC_HOST ? [PUBLIC_HOST] : undefined,
      hmr: PUBLIC_HOST ? { protocol: "wss", host: PUBLIC_HOST, clientPort: 443 } : undefined,
    },
  },
});

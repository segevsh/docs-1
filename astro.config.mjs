// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

/**
 * Astro config for docs.w6w.io — the public documentation site.
 *
 * Static output, no deploy adapter: deployed as a plain static build
 * (`dist/`), mirroring `packages/frontend/packages/web`'s own
 * `output: "static"` + no-adapter shape (`wrangler pages deploy dist`,
 * `deploy.yml:320-327`).
 */
export default defineConfig({
  site: "https://docs.w6w.io",
  output: "static",
  integrations: [mdx()],
  markdown: {
    // Declared EMPTY on purpose — this is the registration point T3.1.1's
    // channel-tag remark plugin plugs into. Do not remove the empty array
    // even though nothing reads it yet.
    remarkPlugins: [],
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
});

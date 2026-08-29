import { defineConfig, devices } from "@playwright/test";

/**
 * The docs site's browser suite. Runs against `tests/fixture-site.mjs`'s
 * build — synthetic edge-case content (`tests/fixtures/content/`), never the
 * real `content/` — mirrors `packages/frontend/packages/web/playwright.config.ts`'s
 * shape.
 *
 * NO PIXEL BASELINES — same reasoning as frontend's own config: a font-metric
 * difference between this devcontainer and CI would drift a screenshot
 * baseline for reasons unrelated to any real change. Layout is asserted with
 * measured properties (bounding boxes, `scrollWidth`) instead.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : process.stdout.isTTY ? [["list"]] : [["line"]],

  use: {
    baseURL: `http://127.0.0.1:${process.env.DOCS_TEST_PORT ?? 4330}`,
    screenshot: "only-on-failure",
    trace: "on",
    video: "off",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "node tests/fixture-site.mjs",
    url: `http://127.0.0.1:${process.env.DOCS_TEST_PORT ?? 4330}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

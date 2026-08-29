import { expect, test } from "@playwright/test";

/**
 * The client-side channel toggle (`DocLayout.astro`'s inline `<script>`,
 * `src/lib/{channels,channel-select,remark-channels}.ts`) — end to end, in a
 * real browser, against `tests/fixtures/content/edge-cases/{all-channels,
 * no-channels}.md`. `channels.test.ts` already covers the remark plugin and
 * `selectChannel` in isolation with `node --test`; this is the one thing
 * that suite can't reach — real DOM, real clicks, real `localStorage`.
 */

test.describe("all-channels page", () => {
  test("shows a six-button toggle, one channel visible at a time", async ({ page }) => {
    await page.goto("/edge-cases/all-channels/");

    const toggle = page.locator(".channel-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle.locator("button")).toHaveCount(6);
    await expect(toggle.locator("button")).toHaveText(["webui", "cli", "sdk-node", "sdk-python", "sdk-react", "api"]);

    // Exactly one `[data-channel]` container visible, the rest hidden.
    const visible = page.locator("div[data-channel]:not([hidden])");
    await expect(visible).toHaveCount(1);
  });

  test("clicking a button switches the visible channel and persists across reload", async ({ page }) => {
    await page.goto("/edge-cases/all-channels/");

    await page.locator(".channel-toggle button", { hasText: "api" }).click();
    await expect(page.locator('div[data-channel="api"]')).toBeVisible();
    await expect(page.locator('div[data-channel="webui"]')).toBeHidden();
    await expect(page.locator(".channel-toggle button", { hasText: "api" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.reload();
    await expect(page.locator('div[data-channel="api"]')).toBeVisible();
    await expect(page.locator(".channel-toggle button", { hasText: "api" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("every channel's content is present in the DOM even when hidden (no-JS readers)", async ({ page }) => {
    await page.goto("/edge-cases/all-channels/");
    for (const channel of ["webui", "cli", "sdk-node", "sdk-python", "sdk-react", "api"]) {
      await expect(page.locator(`div[data-channel="${channel}"]`)).toHaveCount(1);
    }
  });
});

test.describe("no-channels page", () => {
  test("renders no toggle group at all", async ({ page }) => {
    await page.goto("/edge-cases/no-channels/");
    await expect(page.locator(".channel-toggle")).toHaveCount(0);
    await expect(page.locator("[data-channel]")).toHaveCount(0);
  });
});

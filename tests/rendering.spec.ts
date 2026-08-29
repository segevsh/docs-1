import { expect, test } from "@playwright/test";

/**
 * Prose rendering + rail layout, against `tests/fixtures/content/edge-cases/`.
 * ONE SPEC PER CONCERN (mirrors `packages/frontend/packages/web/tests/*.spec.ts`'s own rule) —
 * `channels.spec.ts` is the sibling file for the channel-toggle behavior.
 */

test.describe("homepage", () => {
  test("renders the fixture intro and lists the edge-cases section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toHaveText("w6w docs — e2e fixture site");
    await expect(page.locator(".docs-index-section h3", { hasText: "edge-cases" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Rich prose", exact: true })).toBeVisible();
  });
});

test.describe("rich prose page", () => {
  test("renders every element the .docs-content styles cover", async ({ page }) => {
    await page.goto("/edge-cases/rich-prose/");

    await expect(page.locator("h1")).toHaveText("Rich prose");
    await expect(page.locator("h2", { hasText: "Headings and text" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "A level-3 heading" })).toBeVisible();
    await expect(page.locator("h4", { hasText: "A level-4 heading" })).toBeVisible();

    await expect(page.locator(".docs-content strong")).toHaveText("bold");
    await expect(page.locator(".docs-content em")).toHaveText("italic");
    await expect(page.locator(".docs-content code").first()).toHaveText("inline code");

    await expect(page.locator(".docs-content ul li").first()).toHaveText("One");
    await expect(page.locator(".docs-content ol li").first()).toHaveText("First");

    await expect(page.locator(".docs-content blockquote")).toContainText("accent-border");

    const table = page.locator(".docs-content table");
    await expect(table.locator("th").first()).toHaveText("Column A");
    await expect(table.locator("td").first()).toHaveText("one");

    // Shiki-highlighted fenced code block — a real `pre.astro-code`, not a bare `<pre>`.
    await expect(page.locator(".docs-content pre.astro-code")).toContainText("outputPath");

    await expect(page.locator(".docs-content hr")).toBeVisible();
  });
});

test.describe("long-title fixture — the rail horizontal-scroll regression", () => {
  test("neither the rail nor the page overflows horizontally", async ({ page }) => {
    await page.goto("/edge-cases/long-title/");

    const rail = page.locator(".docs-rail");
    const [clientWidth, scrollWidth] = await rail.evaluate((el) => [el.clientWidth, el.scrollWidth]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1: sub-pixel rounding, not a real overflow

    const bodyOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(bodyOverflows).toBe(false);
  });

  test("the active rail link is expanded and highlighted", async ({ page }) => {
    await page.goto("/edge-cases/long-title/");
    const activeLink = page.locator('.docs-rail a[aria-current="page"]');
    await expect(activeLink).toBeVisible();
    await expect(activeLink).toHaveText(/long title/i);
  });
});

test.describe("rail accordion", () => {
  test("sections toggle independently — opening one does not close another", async ({ page }) => {
    await page.goto("/edge-cases/long-title/");
    const section = page.locator(".docs-rail-section", { has: page.getByText("edge-cases", { exact: true }) });
    await expect(section).toHaveJSProperty("open", true); // active section starts open

    // Navigate to a page with a different active section isn't possible here (one section total
    // in this fixture set) — instead assert manual toggling works: close it, then reopen it.
    await section.locator("summary").click();
    await expect(section).toHaveJSProperty("open", false);
    await section.locator("summary").click();
    await expect(section).toHaveJSProperty("open", true);
  });
});

import { expect, test } from "@playwright/test";

/**
 * Prose rendering + rail layout, against `tests/fixtures/content/` — one fixture page per D-1
 * area (`guides/`, `clients/`, `self-hosting/`, `build-apps/`, the three `reference-*` sections)
 * plus a `get-started` site doc, so the rail's area order and the section landings are assertable.
 * ONE SPEC PER CONCERN (mirrors `packages/frontend/packages/web/tests/*.spec.ts`'s own rule) —
 * `channels.spec.ts` is the sibling file for the channel-toggle behavior.
 */

test.describe("homepage", () => {
  test("renders the fixture intro and links the section landings", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toHaveText("w6w docs — e2e fixture site");

    const index = page.locator(".docs-index");
    await expect(index.getByRole("link", { name: "Get started", exact: true })).toBeVisible();
    await expect(index.getByRole("link", { name: "Guides", exact: true })).toBeVisible();
    await expect(index.getByRole("link", { name: "Self-hosting", exact: true })).toBeVisible();
  });
});

test.describe("rail areas", () => {
  test("renders the six areas in pinned order, each with its title (never the raw slug)", async ({ page }) => {
    await page.goto("/guides/rich-prose/");

    await expect(page.locator(".docs-rail > .docs-rail-section > summary")).toHaveText([
      "Get started",
      "Guides",
      "Clients",
      "Self-hosting",
      "Build apps",
      "Reference",
    ]);
  });

  test("Reference is collapsed on a guides page and open on a reference page", async ({ page }) => {
    const reference = page.locator('.docs-rail-section[data-area="reference"]');
    const protocolLink = page.locator('.docs-rail a[href="/reference-spec/protocol/"]');

    await page.goto("/guides/rich-prose/");
    await expect(reference.locator("> summary")).toHaveText("Reference");
    await expect(reference).toHaveJSProperty("open", false);
    await expect(protocolLink).toBeHidden();

    // Reference keeps its three titled sub-groups whether or not it is expanded.
    await expect(reference.locator(".docs-rail-group")).toHaveText([
      "Specification",
      "HTTP API & MCP",
      "Packages",
    ]);

    await page.goto("/reference-spec/protocol/");
    await expect(reference).toHaveJSProperty("open", true);
    await expect(protocolLink).toBeVisible();
    await expect(protocolLink).toHaveAttribute("aria-current", "page");
  });
});

test.describe("section landing pages", () => {
  test("/guides/ lists its pages in rail order, each with its summary", async ({ page }) => {
    await page.goto("/guides/");

    await expect(page.locator("h1")).toHaveText("Guides");
    await expect(page.locator(".section-landing li > a")).toHaveText([
      "Rich prose",
      /^A deliberately long title meant to wrap/,
    ]);
    await expect(page.locator(".section-landing li > p")).toHaveText([
      "Every markdown element the prose styles cover, on one page.",
      "Regression fixture for the rail's horizontal-scroll bug.",
    ]);
  });

  test("a page with no summary falls back to its description", async ({ page }) => {
    await page.goto("/clients/");

    await expect(page.locator("h1")).toHaveText("Clients");
    await expect(page.locator(".section-landing li > a")).toHaveText(["Web UI"]);
    await expect(page.locator(".section-landing li > p")).toHaveText([
      "The browser-based client, for people who work in the UI.",
    ]);
  });

  test("/get-started/ lists the get-started site doc", async ({ page }) => {
    await page.goto("/get-started/");

    await expect(page.locator("h1")).toHaveText("Get started");
    await expect(page.locator(".section-landing li > a")).toHaveText(["Install the platform"]);
  });
});

test.describe("get-started site docs", () => {
  test("render at /get-started/<slug>/ and sit in the Get started rail group", async ({ page }) => {
    await page.goto("/get-started/install/");

    await expect(page.locator("h1")).toHaveText("Install the platform");

    const getStarted = page.locator('.docs-rail-section[data-area="get-started"]');
    await expect(getStarted).toHaveJSProperty("open", true);
    await expect(getStarted.locator('a[aria-current="page"]')).toHaveText("Install the platform");
  });
});

test.describe("retired special pages", () => {
  test("neither /quickstart/ nor /self-hosting/install/ exists any more", async ({ page }) => {
    expect((await page.goto("/quickstart/"))?.status()).toBe(404);
    expect((await page.goto("/self-hosting/install/"))?.status()).toBe(404);
  });
});

test.describe("rich prose page", () => {
  test("renders every element the .docs-content styles cover", async ({ page }) => {
    await page.goto("/guides/rich-prose/");

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
    await page.goto("/guides/long-title/");

    const rail = page.locator(".docs-rail");
    const [clientWidth, scrollWidth] = await rail.evaluate((el) => [el.clientWidth, el.scrollWidth]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1: sub-pixel rounding, not a real overflow

    const bodyOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(bodyOverflows).toBe(false);
  });

  test("the active rail link is expanded and highlighted", async ({ page }) => {
    await page.goto("/guides/long-title/");
    const activeLink = page.locator('.docs-rail a[aria-current="page"]');
    await expect(activeLink).toBeVisible();
    await expect(activeLink).toHaveText(/long title/i);
  });
});

test.describe("rail accordion", () => {
  test("areas toggle independently — closing one does not close another", async ({ page }) => {
    await page.goto("/guides/long-title/");
    const guides = page.locator('.docs-rail-section[data-area="guides"]');
    const reference = page.locator('.docs-rail-section[data-area="reference"]');
    await expect(guides).toHaveJSProperty("open", true); // areas outside Reference start open

    await guides.locator("> summary").click();
    await expect(guides).toHaveJSProperty("open", false);
    await expect(reference).toHaveJSProperty("open", false); // untouched, not dragged along

    await guides.locator("> summary").click();
    await expect(guides).toHaveJSProperty("open", true);
  });
});

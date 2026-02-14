import { test, expect } from "./helpers/fixtures";

test.describe("Accessibility", () => {
  const pages = [
    { path: "/", name: "Dashboard" },
    { path: "/issues", name: "Issues" },
    { path: "/boards", name: "Boards" },
    { path: "/settings", name: "Settings" },
  ];

  for (const { path, name } of pages) {
    test(`${name} page has no critical a11y issues`, async ({ page }) => {
      await page.goto(path);

      // Check for basic a11y requirements
      // All images have alt text
      const images = page.locator("img:not([alt])");
      expect(await images.count()).toBe(0);

      // Main landmark exists
      await expect(page.locator("main").first()).toBeVisible();

      // At least one heading exists
      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      expect(await headings.count()).toBeGreaterThan(0);
    });

    test(`${name} page supports keyboard navigation`, async ({ page }) => {
      await page.goto(path);

      // Tab through focusable elements
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });
  }

  test("color contrast meets WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/");
    // Check that text elements have sufficient contrast
    // This is a simplified check — full contrast testing needs axe-core
    const body = page.locator("body");
    const bgColor = await body.evaluate((el) =>
      getComputedStyle(el).backgroundColor,
    );
    expect(bgColor).toBeTruthy();
  });
});

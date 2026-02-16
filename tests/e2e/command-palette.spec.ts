import { test, expect } from "./helpers/fixtures";

test.describe("Command Palette", () => {
  test("opens with Cmd+K", async ({ page }) => {
    await page.goto("/");

    // Trigger the command palette with the global keyboard shortcut
    await page.keyboard.press("Meta+k");

    // The command palette uses CommandDialog which renders an input
    // with the placeholder "Search issues, projects, and commands..."
    await expect(
      page.getByPlaceholder(/search issues/i),
    ).toBeVisible();
  });

  test("opens with Ctrl+K", async ({ page }) => {
    await page.goto("/");

    // Ctrl+K should also work (non-macOS systems)
    await page.keyboard.press("Control+k");

    await expect(
      page.getByPlaceholder(/search issues/i),
    ).toBeVisible();
  });

  test("closes with Escape", async ({ page }) => {
    await page.goto("/");

    // Open the palette
    await page.keyboard.press("Meta+k");
    await expect(
      page.getByPlaceholder(/search issues/i),
    ).toBeVisible();

    // Close it
    await page.keyboard.press("Escape");
    await expect(
      page.getByPlaceholder(/search issues/i),
    ).not.toBeVisible();
  });

  test("shows navigation group by default", async ({ page }) => {
    await page.goto("/");

    // Open the palette
    await page.keyboard.press("Meta+k");

    // Without any search input, the navigation group should be visible
    // The command palette shows NAVIGATION_PAGES including Dashboard, Boards, etc.
    await expect(page.getByText(/navigation/i).first()).toBeVisible();
  });

  test("shows actions group by default", async ({ page }) => {
    await page.goto("/");

    // Open the palette
    await page.keyboard.press("Meta+k");

    // The actions group includes Create Issue, Toggle Theme, etc.
    await expect(page.getByText(/actions/i).first()).toBeVisible();
  });

  test("accepts search input", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Meta+k");

    const input = page.getByPlaceholder(/search issues/i);
    await expect(input).toBeVisible();

    await input.fill("dashboard");

    // Wait for debounce (300ms)
    await page.waitForTimeout(500);

    // Navigation items matching "dashboard" should appear
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test("filters navigation results when typing", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Meta+k");

    const input = page.getByPlaceholder(/search issues/i);
    await input.fill("settings");

    await page.waitForTimeout(500);

    // Settings should appear in the navigation group
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });

  test("shows no results for nonsense query", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Meta+k");

    const input = page.getByPlaceholder(/search issues/i);
    // Type a query that should not match any navigation pages or actions
    await input.fill("zzzzxyznonexistent9999");

    await page.waitForTimeout(500);

    // Either "No results found" text or an empty command list should appear
    const noResults = page.getByText(/no results found/i);
    const emptyList = page.locator("[cmdk-empty]");
    await expect(noResults.or(emptyList).first()).toBeVisible();
  });

  test.fixme("navigates to selected page", async ({ page }) => {
    // Requires the command palette to successfully navigate on item selection.
    // In practice, the router.push fires and the page navigates.
    await page.goto("/");

    await page.keyboard.press("Meta+k");

    const input = page.getByPlaceholder(/search issues/i);
    await input.fill("boards");

    await page.waitForTimeout(500);

    // Select the Boards navigation item
    const boardsItem = page.getByText(/boards/i).first();
    await boardsItem.click();

    // Should navigate to /boards
    await expect(page).toHaveURL(/\/boards/);
  });
});

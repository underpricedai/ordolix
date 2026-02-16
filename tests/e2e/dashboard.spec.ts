import { test, expect } from "./helpers/fixtures";

test.describe("Dashboard Page", () => {
  test("shows dashboards page with heading", async ({ page }) => {
    await page.goto("/dashboards");

    // The dashboards page heading should be visible
    await expect(page.locator("h1")).toContainText(/dashboard/i);
  });

  test("shows page description text", async ({ page }) => {
    await page.goto("/dashboards");

    // The page has a description paragraph below the heading
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("p").first()).toBeVisible();
  });

  test("shows switch dashboard button", async ({ page }) => {
    await page.goto("/dashboards");

    // The "Switch Dashboard" button opens the dashboard selector sheet
    const switchButton = page.getByRole("button", { name: /switch dashboard/i });
    await expect(switchButton).toBeVisible();
  });

  test("shows dashboard content area or empty state", async ({ page }) => {
    await page.goto("/dashboards");

    // Either a dashboard view is rendered or an empty state is shown
    // The main content area should always be present
    const content = page.locator("main").or(page.locator("[class*='flex-1']"));
    await expect(content.first()).toBeVisible();
  });

  test("opens dashboard selector sheet", async ({ page }) => {
    await page.goto("/dashboards");

    // Click the switch dashboard button
    const switchButton = page.getByRole("button", { name: /switch dashboard/i });
    await switchButton.click();

    // A side sheet should open with the dashboard selector
    // Sheet renders with role="dialog"
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
  });

  test("dashboard selector sheet has title", async ({ page }) => {
    await page.goto("/dashboards");

    // Open the selector sheet
    await page.getByRole("button", { name: /switch dashboard/i }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Sheet should have a title
    await expect(sheet.locator("h2, [class*='title']").first()).toBeVisible();
  });

  test("dashboard selector sheet can be closed", async ({ page }) => {
    await page.goto("/dashboards");

    // Open the selector sheet
    await page.getByRole("button", { name: /switch dashboard/i }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Close via Escape key
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
  });

  test("dashboards page has main landmark", async ({ page }) => {
    await page.goto("/dashboards");

    // Accessibility: the page should have a main landmark
    await expect(page.locator("main").first()).toBeVisible();
  });

  test.fixme("shows dashboard widgets when dashboard exists", async ({ page }) => {
    // Requires a real database with seeded dashboards and widgets.
    await page.goto("/dashboards");

    // A dashboard view should render with widget cards
    const widgetCards = page.locator("[class*='card']");
    expect(await widgetCards.count()).toBeGreaterThanOrEqual(1);
  });

  test.fixme("switches between dashboards", async ({ page }) => {
    // Requires a real database with multiple seeded dashboards.
    await page.goto("/dashboards");

    // Open selector
    await page.getByRole("button", { name: /switch dashboard/i }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Select a different dashboard from the list
    const dashboardItem = sheet.locator("button, [role='button']").first();
    if (await dashboardItem.isVisible()) {
      await dashboardItem.click();

      // Sheet should close after selection
      await expect(sheet).not.toBeVisible();
    }
  });
});

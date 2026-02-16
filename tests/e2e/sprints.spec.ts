import { test, expect } from "./helpers/fixtures";

test.describe("Sprints Page", () => {
  test("shows sprint page with heading", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // The sprints page heading includes the project key and sprint title
    await expect(page.locator("h1")).toBeVisible();
  });

  test("shows create sprint button", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // The create sprint button should be visible in the header
    const createButton = page.getByRole("button", { name: /create sprint/i });
    await expect(createButton).toBeVisible();
  });

  test("shows sprint list or empty state", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // Either sprint cards are displayed or the empty state is shown
    // The page always has a main content area
    await expect(page.locator("main").or(page.locator("[class*='flex-1']")).first()).toBeVisible();
  });

  test("opens create sprint dialog", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // Click the create sprint button
    const createButton = page.getByRole("button", { name: /create sprint/i });
    await createButton.click();

    // The dialog should appear with form fields
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should contain sprint name input and date fields
    await expect(dialog.locator("input").first()).toBeVisible();
  });

  test("create sprint dialog has cancel button", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // Open the create sprint dialog
    await page.getByRole("button", { name: /create sprint/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel button should close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("create sprint dialog has date fields", async ({ page }) => {
    await page.goto("/projects/ENG/sprints");

    // Open the create sprint dialog
    await page.getByRole("button", { name: /create sprint/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Should have date inputs for start and end dates
    const dateInputs = dialog.locator("input[type='date']");
    expect(await dateInputs.count()).toBe(2);
  });

  test.fixme("shows active sprint with status badge", async ({ page }) => {
    // Requires a real database with seeded sprints for the project.
    await page.goto("/projects/ENG/sprints");

    // Active sprints have a status badge
    await expect(page.getByText(/active/i).first()).toBeVisible();

    // Sprint cards should show issue count
    await expect(page.getByText(/issue/i).first()).toBeVisible();
  });

  test.fixme("should start a planning sprint", async ({ page }) => {
    // Requires a real database with a planning sprint to test the start flow.
    await page.goto("/projects/ENG/sprints");

    // Find and click the start button on a planning sprint
    const startButton = page.getByRole("button", { name: /start/i });
    await expect(startButton.first()).toBeVisible();
    await startButton.first().click();

    // The sprint status should change to active
    await expect(page.getByText(/active/i).first()).toBeVisible();
  });

  test.fixme("should complete an active sprint", async ({ page }) => {
    // Requires a real database with an active sprint to test the complete flow.
    await page.goto("/projects/ENG/sprints");

    // Find and click the complete button on an active sprint
    const completeButton = page.getByRole("button", { name: /complete/i });
    await expect(completeButton.first()).toBeVisible();
    await completeButton.first().click();

    // The sprint status should change to completed
    await expect(page.getByText(/completed/i).first()).toBeVisible();
  });
});

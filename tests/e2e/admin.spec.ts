import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Admin", () => {
  test.beforeEach(async ({ page }) => {
    // All admin tests require admin authentication
    await loginAsAdmin(page);
  });

  test("should display admin dashboard with heading", async ({ page }) => {
    await page.goto("/admin");

    // Admin page heading should be visible
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();
  });

  test("should display admin sidebar navigation", async ({ page }) => {
    await page.goto("/admin");

    // Admin sidebar navigation should be present.
    // The admin layout uses aria-label from ta("title") which translates to
    // the admin panel title. Look for the nav element with admin-related content.
    const adminNav = page.locator("nav").filter({ hasText: /users/i });
    await expect(adminNav.first()).toBeVisible();

    // Sidebar should show key admin sections
    await expect(adminNav.getByText(/users/i).first()).toBeVisible();
    await expect(adminNav.getByText(/workflows/i).first()).toBeVisible();
  });

  test("should display admin stat cards", async ({ page }) => {
    await page.goto("/admin");

    // Summary stat cards should be displayed (even if loading/errored,
    // the card containers are rendered). The grid has 4 stat cards.
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test("should navigate to admin workflows page", async ({ page }) => {
    await page.goto("/admin/workflows");

    // Workflows page heading should be visible
    await expect(
      page.getByRole("heading", { name: /workflows/i }),
    ).toBeVisible();

    // Create workflow button should be present
    const createButton = page.getByRole("button", { name: /create workflow/i });
    await expect(createButton).toBeVisible();
  });

  test("should navigate to admin fields page", async ({ page }) => {
    await page.goto("/admin/fields");

    // Custom fields page heading should be visible
    await expect(
      page.getByRole("heading", { name: /custom fields/i }),
    ).toBeVisible();

    // Create field button should be present
    const createButton = page.getByRole("button", { name: /create field/i });
    await expect(createButton).toBeVisible();
  });

  test("should open create field dialog", async ({ page }) => {
    await page.goto("/admin/fields");

    // Click create field button
    const createButton = page.getByRole("button", { name: /create field/i });
    await createButton.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should contain field configuration options
    await expect(dialog.locator("input, select, [role='combobox']").first()).toBeVisible();

    // Cancel should close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("should navigate to admin users page", async ({ page }) => {
    await page.goto("/admin/users");

    // Users page heading should be visible
    await expect(
      page.getByRole("heading", { name: /users/i }),
    ).toBeVisible();

    // Invite user button should be present
    const inviteButton = page.getByRole("button", { name: /invite user/i });
    await expect(inviteButton).toBeVisible();

    // Search bar should be available
    await expect(page.locator("input[type='search']").first()).toBeVisible();
  });

  test("should open invite user dialog", async ({ page }) => {
    await page.goto("/admin/users");

    // Click invite user button
    const inviteButton = page.getByRole("button", { name: /invite user/i });
    await inviteButton.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should have email input
    await expect(dialog.locator("input[type='email']")).toBeVisible();

    // Cancel should close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test.fixme("should manage workflows with real data", async ({ page }) => {
    // Requires a real database to show workflow list and test create flow.
    await page.goto("/admin/workflows");

    await expect(
      page.getByRole("heading", { name: /workflows/i }),
    ).toBeVisible();

    const createButton = page.getByRole("button", { name: /create workflow/i });
    await createButton.click();

    await expect(
      page.getByRole("dialog").or(page.getByText(/workflow name/i)),
    ).toBeVisible();
  });

  test.fixme("should manage custom fields with full form", async ({ page }) => {
    // Requires a real database to verify field creation and label mappings.
    await page.goto("/admin/fields");

    const createButton = page.getByRole("button", { name: /create field/i });
    await createButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByLabel(/field name/i)).toBeVisible();
    await expect(dialog.getByLabel(/field type/i)).toBeVisible();
    await expect(dialog.getByLabel(/context/i)).toBeVisible();
    await expect(dialog.getByLabel(/required/i)).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test.fixme("should manage users with full invite flow", async ({ page }) => {
    // Requires a real database to verify user invitation and role assignment.
    await page.goto("/admin/users");

    const inviteButton = page.getByRole("button", { name: /invite user/i });
    await inviteButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByLabel(/email/i)).toBeVisible();
    await expect(dialog.getByLabel(/role/i)).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});

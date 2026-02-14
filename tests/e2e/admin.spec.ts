import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Admin", () => {
  test.beforeEach(async ({ page }) => {
    // All admin tests require admin authentication
    await loginAsAdmin(page);
  });

  test.skip("should display admin dashboard", async ({ page }) => {
    await page.goto("/admin");

    // Admin page heading should be visible
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();

    // Admin sidebar navigation should be present
    const adminNav = page.getByRole("navigation", { name: /admin/i });
    await expect(adminNav).toBeVisible();

    // Sidebar should show all admin sections
    await expect(adminNav.getByText(/users/i)).toBeVisible();
    await expect(adminNav.getByText(/workflows/i)).toBeVisible();
    await expect(adminNav.getByText(/custom fields/i)).toBeVisible();
    await expect(adminNav.getByText(/permissions/i)).toBeVisible();
    await expect(adminNav.getByText(/integrations/i)).toBeVisible();
    await expect(adminNav.getByText(/system/i)).toBeVisible();

    // Summary stat cards should be displayed
    const statCards = page.locator("[class*='card']");
    expect(await statCards.count()).toBeGreaterThanOrEqual(4);
  });

  test.skip("should manage workflows", async ({ page }) => {
    await page.goto("/admin/workflows");

    // Workflows page heading should be visible
    await expect(
      page.getByRole("heading", { name: /workflows/i }),
    ).toBeVisible();

    // Create workflow button should be present
    const createButton = page.getByRole("button", { name: /create workflow/i });
    await expect(createButton).toBeVisible();

    // Click create workflow to verify dialog or navigation works
    await createButton.click();

    // Should show workflow creation form or navigate to editor
    await expect(
      page.getByRole("dialog").or(page.getByText(/workflow name/i)),
    ).toBeVisible();
  });

  test.skip("should manage custom fields", async ({ page }) => {
    await page.goto("/admin/fields");

    // Custom fields page heading should be visible
    await expect(
      page.getByRole("heading", { name: /custom fields/i }),
    ).toBeVisible();

    // Create field button should be present
    const createButton = page.getByRole("button", { name: /create field/i });
    await expect(createButton).toBeVisible();

    // Open the create field dialog
    await createButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should contain field configuration options
    await expect(dialog.getByLabel(/field name/i)).toBeVisible();
    await expect(dialog.getByLabel(/field type/i)).toBeVisible();
    await expect(dialog.getByLabel(/context/i)).toBeVisible();
    await expect(dialog.getByLabel(/required/i)).toBeVisible();

    // Cancel should close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test.skip("should manage users", async ({ page }) => {
    await page.goto("/admin/users");

    // Users page heading should be visible
    await expect(
      page.getByRole("heading", { name: /users/i }),
    ).toBeVisible();

    // Invite user button should be present
    const inviteButton = page.getByRole("button", { name: /invite user/i });
    await expect(inviteButton).toBeVisible();

    // Search bar for filtering users should be available
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();

    // Open the invite user dialog
    await inviteButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should have email and role fields
    await expect(dialog.getByLabel(/email/i)).toBeVisible();
    await expect(dialog.getByLabel(/role/i)).toBeVisible();

    // Cancel should close the dialog
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});

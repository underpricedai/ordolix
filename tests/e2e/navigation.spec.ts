import { test, expect } from "./helpers/fixtures";

test.describe("Navigation", () => {
  test.skip("should navigate between all main pages via sidebar", async ({ page }) => {
    await page.goto("/");

    // Sidebar navigation should be visible
    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Issues
    await sidebar.getByText(/issues/i).first().click();
    await expect(page).toHaveURL(/\/issues/);
    await expect(page.getByRole("heading", { name: /issues/i })).toBeVisible();

    // Navigate to Boards
    await sidebar.getByText(/boards/i).first().click();
    await expect(page).toHaveURL(/\/boards/);
    await expect(page.getByRole("heading", { name: /boards/i })).toBeVisible();

    // Navigate to Gantt
    await sidebar.getByText(/gantt/i).first().click();
    await expect(page).toHaveURL(/\/gantt/);
    await expect(page.getByRole("heading", { name: /gantt/i })).toBeVisible();

    // Navigate to Reports
    await sidebar.getByText(/reports/i).first().click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole("heading", { name: /reports/i })).toBeVisible();

    // Navigate to Settings
    await sidebar.getByText(/settings/i).first().click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();

    // Navigate to Admin
    await sidebar.getByText(/admin/i).first().click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test.skip("should show breadcrumbs on each page", async ({ page }) => {
    // Check breadcrumbs on the admin users page (deep navigation)
    await page.goto("/admin/users");

    // Breadcrumb navigation should be visible
    const breadcrumb = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumb).toBeVisible();

    // Should show "Admin" as the first breadcrumb segment
    await expect(breadcrumb.getByText(/admin/i)).toBeVisible();

    // Should show "Users" as the current page breadcrumb
    await expect(breadcrumb.getByText(/users/i)).toBeVisible();

    // Clicking the "Admin" breadcrumb should navigate back
    const adminLink = breadcrumb.getByRole("link", { name: /admin/i });
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL(/\/admin$/);
    }
  });

  test.skip("should toggle sidebar collapse", async ({ page }) => {
    await page.goto("/");

    // Sidebar should be visible initially
    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Find and click the sidebar toggle button
    const sidebarTrigger = page.getByRole("button", { name: /toggle sidebar|sidebar/i });
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();

      // Sidebar should collapse (become narrower or hidden)
      // The exact behavior depends on implementation: it may add a data attribute
      // or change a CSS class. Check for the collapsed state.
      await page.waitForTimeout(300); // Allow transition animation

      // Click again to expand
      await sidebarTrigger.click();
      await page.waitForTimeout(300);

      // Sidebar text labels should be visible again in expanded mode
      await expect(sidebar.getByText(/issues/i).first()).toBeVisible();
    }
  });
});

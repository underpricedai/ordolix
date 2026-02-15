import { test, expect } from "./helpers/fixtures";

test.describe("Navigation", () => {
  test("should navigate to issues page via sidebar", async ({ page }) => {
    await page.goto("/");

    // Sidebar navigation should be visible
    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Issues
    await sidebar.getByText(/issues/i).first().click();
    await expect(page).toHaveURL(/\/issues/);
    await expect(page.getByRole("heading", { name: /issues/i })).toBeVisible();
  });

  test("should navigate to boards page via sidebar", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Boards
    await sidebar.getByText(/boards/i).first().click();
    await expect(page).toHaveURL(/\/boards/);
    await expect(page.getByRole("heading", { name: /boards/i })).toBeVisible();
  });

  test("should navigate to gantt page via sidebar", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Gantt
    await sidebar.getByText(/gantt/i).first().click();
    await expect(page).toHaveURL(/\/gantt/);
  });

  test("should navigate to workflows page via sidebar", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Workflows
    await sidebar.getByText(/workflows/i).first().click();
    await expect(page).toHaveURL(/\/workflows/);
  });

  test("should navigate to reports page via sidebar", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Reports
    await sidebar.getByText(/reports/i).first().click();
    await expect(page).toHaveURL(/\/reports/);
  });

  test("should navigate to settings page via sidebar", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.getByRole("navigation");
    await expect(sidebar.first()).toBeVisible();

    // Navigate to Settings
    await sidebar.getByText(/settings/i).first().click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
  });

  test("should display breadcrumbs on pages", async ({ page }) => {
    await page.goto("/issues");

    // Breadcrumb navigation should be visible.
    // The AppHeader renders breadcrumbs as a nav with BreadcrumbList.
    const breadcrumb = page.locator("nav").filter({ has: page.locator("ol") });
    await expect(breadcrumb.first()).toBeVisible();
  });

  test("should show sidebar toggle button", async ({ page }) => {
    await page.goto("/");

    // The sidebar toggle (SidebarTrigger) should be visible in the header
    const sidebarTrigger = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(sidebarTrigger).toBeVisible();
  });

  test("should toggle sidebar when clicking the trigger", async ({ page }) => {
    await page.goto("/");

    const sidebarTrigger = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(sidebarTrigger).toBeVisible();

    // Click to collapse the sidebar
    await sidebarTrigger.click();

    // Wait for transition animation
    await page.waitForTimeout(300);

    // Click again to expand
    await sidebarTrigger.click();

    // Wait for transition animation
    await page.waitForTimeout(300);

    // Sidebar text labels should be visible again in expanded mode
    const sidebar = page.getByRole("navigation");
    await expect(sidebar.getByText(/issues/i).first()).toBeVisible();
  });

  test("should navigate back to dashboard via logo", async ({ page }) => {
    // Start on a non-home page
    await page.goto("/issues");

    // Click the Ordolix logo/home link in the sidebar
    const homeLink = page.getByLabel(/ordolix home/i);
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    // Should navigate back to the dashboard
    await expect(page).toHaveURL("/");
  });

  test.fixme("should show breadcrumbs with navigation on admin pages", async ({ page }) => {
    // Requires admin auth and specific breadcrumb structure to test navigation.
    // The admin layout renders its own breadcrumbs which may differ from
    // the standard BreadcrumbLink-based navigation.
    await page.goto("/admin/users");

    const breadcrumb = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumb).toBeVisible();

    await expect(breadcrumb.getByText(/admin/i)).toBeVisible();
    await expect(breadcrumb.getByText(/users/i)).toBeVisible();

    const adminLink = breadcrumb.getByRole("link", { name: /admin/i });
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL(/\/admin$/);
    }
  });
});

import { test, expect } from "./helpers/fixtures";

test.describe("Issues", () => {
  test.describe("Issue List", () => {
    test("should display issues list page", async ({ page }) => {
      await page.goto("/issues");

      // Page heading should be visible
      await expect(
        page.getByRole("heading", { name: /issues/i }),
      ).toBeVisible();

      // Create issue button should be available
      await expect(
        page.getByRole("button", { name: /create issue/i }),
      ).toBeVisible();

      // Search input should be present
      await expect(page.locator("input[type='search']").first()).toBeVisible();
    });

    test("should have a working search input", async ({ page }) => {
      await page.goto("/issues");

      // The search input should accept text
      const searchInput = page.locator("input[type='search']").first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");
    });
  });

  test.describe("Issue Creation", () => {
    test("should open create issue dialog", async ({ page }) => {
      await page.goto("/issues");

      // Click the create issue button
      await page.getByRole("button", { name: /create issue/i }).click();

      // The dialog should appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
    });

    test.fixme("should create a new issue", async ({ page }) => {
      // Requires a real database to persist issue data and refresh the list.
      await page.goto("/issues");

      await page.getByRole("button", { name: /create issue/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel(/summary/i).fill("Test issue from E2E");
      await dialog.getByLabel(/type/i).click();
      await page.getByRole("option", { name: /task/i }).click();
      await dialog.getByLabel(/priority/i).click();
      await page.getByRole("option", { name: /medium/i }).click();

      await dialog.getByRole("button", { name: /create/i }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText("Test issue from E2E")).toBeVisible();
    });
  });

  test.describe("Issue Detail", () => {
    test.fixme("should open issue detail page", async ({ page }) => {
      // Requires a real database with seeded issues to load issue detail.
      await page.goto("/issues/TEST-1");

      await expect(page.getByTestId("issue-key")).toBeVisible();
      await expect(page.getByTestId("issue-summary")).toBeVisible();
      await expect(page.getByTestId("status-badge")).toBeVisible();
      await expect(page.getByText(/assignee/i)).toBeVisible();
      await expect(page.getByText(/priority/i)).toBeVisible();
      await expect(page.getByText(/reporter/i)).toBeVisible();
    });

    test.fixme("should transition issue status", async ({ page }) => {
      // Requires a real database with seeded issues and workflow transitions.
      await page.goto("/issues/TEST-1");

      const statusBadge = page.getByTestId("status-badge");
      await statusBadge.click();

      const transitionOption = page.getByRole("menuitem", { name: /in progress/i });
      await expect(transitionOption).toBeVisible();
      await transitionOption.click();

      await expect(statusBadge).toHaveText(/in progress/i);
    });

    test.fixme("should add a comment to an issue", async ({ page }) => {
      // Requires a real database with seeded issues and comment persistence.
      await page.goto("/issues/TEST-1");

      const commentsTab = page.getByRole("tab", { name: /comments/i });
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
      }

      const commentInput = page.getByPlaceholder(/add a comment|write a comment/i);
      await expect(commentInput).toBeVisible();
      await commentInput.fill("E2E test comment");

      await page.getByRole("button", { name: /post comment/i }).click();

      await expect(page.getByText("E2E test comment")).toBeVisible();
    });
  });
});

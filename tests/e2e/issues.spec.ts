import { test, expect } from "./helpers/fixtures";

test.describe("Issues", () => {
  test.describe("Issue List", () => {
    test.skip("should display issues list page", async ({ page }) => {
      await page.goto("/issues");

      // Page heading should be visible
      await expect(
        page.getByRole("heading", { name: /issues/i }),
      ).toBeVisible();

      // Issues table or list should render
      await expect(page.getByRole("table")).toBeVisible();

      // Create issue button should be available
      await expect(
        page.getByRole("button", { name: /create issue/i }),
      ).toBeVisible();

      // Search input should be present
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });
  });

  test.describe("Issue Creation", () => {
    test.skip("should create a new issue", async ({ page }) => {
      await page.goto("/issues");

      // Open the create issue dialog
      await page.getByRole("button", { name: /create issue/i }).click();
      const dialog = page.getByRole("dialog", { name: /create issue/i });
      await expect(dialog).toBeVisible();

      // Fill in required fields
      await dialog.getByLabel(/summary/i).fill("Test issue from E2E");
      await dialog.getByLabel(/type/i).click();
      await page.getByRole("option", { name: /task/i }).click();
      await dialog.getByLabel(/priority/i).click();
      await page.getByRole("option", { name: /medium/i }).click();

      // Submit the form
      await dialog.getByRole("button", { name: /create/i }).click();

      // Dialog should close and new issue should appear in the list
      await expect(dialog).not.toBeVisible();
      await expect(page.getByText("Test issue from E2E")).toBeVisible();
    });
  });

  test.describe("Issue Detail", () => {
    test.skip("should open issue detail page", async ({ page }) => {
      // Navigate to a known test issue
      await page.goto("/issues/TEST-1");

      // Issue key and summary should be visible
      await expect(page.getByTestId("issue-key")).toBeVisible();
      await expect(page.getByTestId("issue-summary")).toBeVisible();

      // Status badge should be displayed
      await expect(page.getByTestId("status-badge")).toBeVisible();

      // Details sidebar should show key fields
      await expect(page.getByText(/assignee/i)).toBeVisible();
      await expect(page.getByText(/priority/i)).toBeVisible();
      await expect(page.getByText(/reporter/i)).toBeVisible();
    });

    test.skip("should transition issue status", async ({ page }) => {
      await page.goto("/issues/TEST-1");

      // Click the status badge to open transition options
      const statusBadge = page.getByTestId("status-badge");
      await statusBadge.click();

      // Select a transition (e.g., move to "In Progress")
      const transitionOption = page.getByRole("menuitem", { name: /in progress/i });
      await expect(transitionOption).toBeVisible();
      await transitionOption.click();

      // Status should update to reflect the new state
      await expect(statusBadge).toHaveText(/in progress/i);
    });

    test.skip("should add a comment to an issue", async ({ page }) => {
      await page.goto("/issues/TEST-1");

      // Navigate to comments tab if needed
      const commentsTab = page.getByRole("tab", { name: /comments/i });
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
      }

      // Fill in comment text
      const commentInput = page.getByPlaceholder(/add a comment|write a comment/i);
      await expect(commentInput).toBeVisible();
      await commentInput.fill("E2E test comment");

      // Submit the comment
      await page.getByRole("button", { name: /post comment/i }).click();

      // Comment should appear in the activity feed
      await expect(page.getByText("E2E test comment")).toBeVisible();
    });
  });
});

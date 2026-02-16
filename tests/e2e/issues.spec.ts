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

  test.describe("Issue List - Extended", () => {
    test("should show search input that filters on type", async ({ page }) => {
      await page.goto("/issues");

      // Verify the search input accepts and reflects typed values
      const searchInput = page.locator("input[type='search']").first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill("bug report");
      await expect(searchInput).toHaveValue("bug report");

      // Clear the search
      await searchInput.fill("");
      await expect(searchInput).toHaveValue("");
    });

    test("should have heading and main landmark", async ({ page }) => {
      await page.goto("/issues");

      // Accessibility: main landmark and heading should be present
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });

    test.fixme("should show issue rows with key and summary", async ({ page }) => {
      // Requires a real database with seeded issues to populate the list.
      await page.goto("/issues");

      // Issue rows should display issue keys (e.g., ENG-1)
      const issueRow = page.locator("tr, [role='row'], [data-testid*='issue']").first();
      await expect(issueRow).toBeVisible();
    });

    test.fixme("should show bulk selection checkboxes", async ({ page }) => {
      // Requires a real database with seeded issues so rows are rendered.
      await page.goto("/issues");

      // Checkbox inputs for bulk selection should appear on rows
      const checkbox = page.locator("input[type='checkbox']").first();
      await expect(checkbox).toBeVisible();
    });
  });

  test.describe("Issue Peek Panel", () => {
    test.fixme("should open peek panel on issue click", async ({ page }) => {
      // Requires a real database with seeded issues to click on.
      await page.goto("/issues");

      // Click the first issue row to open the peek panel
      const issueRow = page.locator("tr, [role='row'], [data-testid*='issue']").first();
      await expect(issueRow).toBeVisible();
      await issueRow.click();

      // The peek panel should appear (rendered as a sheet or side panel)
      const peekPanel = page.getByRole("dialog").or(
        page.locator("[data-testid='peek-panel']"),
      );
      await expect(peekPanel.first()).toBeVisible();
    });

    test.fixme("should close peek panel with Escape", async ({ page }) => {
      // Requires a real database with seeded issues.
      await page.goto("/issues");

      const issueRow = page.locator("tr, [role='row'], [data-testid*='issue']").first();
      await expect(issueRow).toBeVisible();
      await issueRow.click();

      const peekPanel = page.getByRole("dialog").or(
        page.locator("[data-testid='peek-panel']"),
      );
      await expect(peekPanel.first()).toBeVisible();

      // Close with Escape
      await page.keyboard.press("Escape");
      await expect(peekPanel.first()).not.toBeVisible();
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

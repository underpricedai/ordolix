import { test, expect } from "./helpers/fixtures";

test.describe("Search", () => {
  test.skip("should display search page", async ({ page }) => {
    await page.goto("/search");

    // Page heading should be visible
    await expect(
      page.getByRole("heading", { name: /search/i }),
    ).toBeVisible();

    // AQL search input should be present
    await expect(
      page.getByPlaceholder(/search with aql|search issues/i),
    ).toBeVisible();

    // Filter controls should be available
    await expect(page.getByText(/filters/i).first()).toBeVisible();

    // Saved filters section should be present
    await expect(page.getByText(/saved filters/i)).toBeVisible();
  });

  test.skip("should execute AQL query and show results", async ({ page }) => {
    await page.goto("/search");

    // Enter an AQL query in the search input
    const searchInput = page.getByPlaceholder(/search with aql|search issues/i);
    await searchInput.fill('status = "In Progress"');

    // Press Enter or click search to execute the query
    await searchInput.press("Enter");

    // Wait for results to load
    await expect(page.getByText(/results/i).first()).toBeVisible();

    // Results should show matching issues in a table or list
    const resultsArea = page.getByTestId("search-results");
    if (await resultsArea.isVisible()) {
      // Result count should be displayed
      await expect(page.getByText(/\d+ result/i)).toBeVisible();
    } else {
      // No results message should appear if no matching issues exist
      await expect(page.getByText(/no results found/i)).toBeVisible();
    }
  });

  test.skip("should filter by project", async ({ page }) => {
    await page.goto("/search");

    // Open the project filter dropdown
    const projectFilter = page.getByRole("button", { name: /project|all projects/i });
    await expect(projectFilter.first()).toBeVisible();
    await projectFilter.first().click();

    // Select a project from the dropdown
    const projectOption = page.getByRole("option").first();
    if (await projectOption.isVisible()) {
      const projectName = await projectOption.textContent();
      await projectOption.click();

      // The filter should be applied and results should update
      if (projectName) {
        await expect(projectFilter.first()).toHaveText(new RegExp(projectName));
      }
    }

    // Results should reflect the filtered project
    await expect(page.getByText(/results/i).first()).toBeVisible();
  });
});

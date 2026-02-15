import { test, expect } from "./helpers/fixtures";

test.describe("Search", () => {
  test("should display search page with heading", async ({ page }) => {
    await page.goto("/search");

    // The search page should render with a heading
    // The page uses t("title") which maps to the search heading
    await expect(page.locator("h2, h1").first()).toBeVisible();
  });

  test("should display AQL search input", async ({ page }) => {
    await page.goto("/search");

    // AQL search input should be present
    const searchInput = page.locator("input[type='search']").first();
    await expect(searchInput).toBeVisible();
  });

  test("should display filters button", async ({ page }) => {
    await page.goto("/search");

    // Filter controls should be available
    const filtersButton = page.getByRole("button", { name: /filters/i });
    await expect(filtersButton).toBeVisible();
  });

  test("should display saved filters section in sidebar", async ({ page }) => {
    await page.goto("/search");

    // On large viewports, the sidebar with saved filters should be present
    // The sidebar is hidden on small screens (lg:block), so check if visible
    const savedFiltersHeading = page.locator("text=Saved Filters").or(
      page.locator("h3").filter({ hasText: /saved/i }),
    );

    // If viewport is large enough, the sidebar should be visible
    const isLargeViewport = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isLargeViewport) {
      await expect(savedFiltersHeading.first()).toBeVisible();
    }
  });

  test("should accept AQL query input", async ({ page }) => {
    await page.goto("/search");

    // Enter an AQL query in the search input
    const searchInput = page.locator("input[type='search']").first();
    await searchInput.fill('status = "In Progress"');
    await expect(searchInput).toHaveValue('status = "In Progress"');
  });

  test("should toggle filter panel", async ({ page }) => {
    await page.goto("/search");

    // Click the filters button to expand filter panel
    const filtersButton = page.getByRole("button", { name: /filters/i });
    await filtersButton.click();

    // Filter dropdowns should appear (the card with filter selects)
    // Check for filter labels like project, type, status, assignee
    await expect(page.locator("label").filter({ hasText: /project/i }).first()).toBeVisible();
  });

  test.fixme("should execute AQL query and show results", async ({ page }) => {
    // Requires a real database with seeded issues to return search results.
    await page.goto("/search");

    const searchInput = page.locator("input[type='search']").first();
    await searchInput.fill('status = "In Progress"');
    await searchInput.press("Enter");

    await expect(page.getByText(/results/i).first()).toBeVisible();

    const resultsArea = page.getByTestId("search-results");
    if (await resultsArea.isVisible()) {
      await expect(page.getByText(/\d+ result/i)).toBeVisible();
    } else {
      await expect(page.getByText(/no results found/i)).toBeVisible();
    }
  });

  test.fixme("should filter by project", async ({ page }) => {
    // Requires a real database with seeded projects to populate filter options.
    await page.goto("/search");

    const projectFilter = page.getByRole("button", { name: /project|all projects/i });
    await expect(projectFilter.first()).toBeVisible();
    await projectFilter.first().click();

    const projectOption = page.getByRole("option").first();
    if (await projectOption.isVisible()) {
      const projectName = await projectOption.textContent();
      await projectOption.click();

      if (projectName) {
        await expect(projectFilter.first()).toHaveText(new RegExp(projectName));
      }
    }

    await expect(page.getByText(/results/i).first()).toBeVisible();
  });
});

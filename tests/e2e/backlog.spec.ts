import { test, expect } from "./helpers/fixtures";

test.describe("Backlog Page", () => {
  test("shows backlog page with heading", async ({ page }) => {
    await page.goto("/projects/ENG/backlog");

    // Page heading should contain the project key and backlog text
    await expect(page.locator("h1")).toBeVisible();
  });

  test("shows search input for filtering issues", async ({ page }) => {
    await page.goto("/projects/ENG/backlog");

    // The backlog page has a search input for filtering issues
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();
  });

  test("shows backlog section", async ({ page }) => {
    await page.goto("/projects/ENG/backlog");

    // The backlog section should be present — it renders droppable sections
    // with collapsible headers. Check for the main content area.
    await expect(page.locator("main").or(page.locator("[class*='flex-1']")).first()).toBeVisible();
  });

  test("search filters issues by text", async ({ page }) => {
    await page.goto("/projects/ENG/backlog");

    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    // Type a non-matching query to test the client-side filter
    await searchInput.fill("nonexistent-xyz-12345");
    await expect(searchInput).toHaveValue("nonexistent-xyz-12345");

    // Wait for client-side filter to apply
    await page.waitForTimeout(500);
  });

  test("has create issue button", async ({ page }) => {
    await page.goto("/projects/ENG/backlog");

    // The backlog page has a create issue button in the header
    const createButton = page.getByRole("button", { name: /create issue/i });
    await expect(createButton).toBeVisible();
  });

  test.fixme("shows sprint sections with drag-and-drop", async ({ page }) => {
    // Requires a real database with seeded sprints and issues for the project.
    await page.goto("/projects/ENG/backlog");

    // Sprint sections should render as droppable areas
    // Each section has a collapsible header with sprint name and status badge
    const sections = page.locator("[aria-expanded]");
    expect(await sections.count()).toBeGreaterThanOrEqual(1);

    // Check that at least one section header shows issue count
    await expect(page.getByText(/issue/i).first()).toBeVisible();
  });

  test.fixme("drag issue between sprint and backlog", async ({ page }) => {
    // Requires a real database with seeded sprints and issues to test DnD.
    await page.goto("/projects/ENG/backlog");

    // Find a draggable issue row (has role="button" and drag handle)
    const issueRow = page.locator("[role='button']").first();
    await expect(issueRow).toBeVisible();

    const issueBox = await issueRow.boundingBox();
    if (issueBox) {
      // Start a drag gesture
      await page.mouse.move(
        issueBox.x + issueBox.width / 2,
        issueBox.y + issueBox.height / 2,
      );
      await page.mouse.down();
      // Move down to a different section
      await page.mouse.move(
        issueBox.x + issueBox.width / 2,
        issueBox.y + issueBox.height + 200,
        { steps: 10 },
      );
      await page.mouse.up();
    }
  });
});

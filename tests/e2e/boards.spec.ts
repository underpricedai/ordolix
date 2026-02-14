import { test, expect } from "./helpers/fixtures";

test.describe("Boards", () => {
  test.skip("should display board page with columns", async ({ page }) => {
    await page.goto("/boards");

    // Page heading should be visible
    await expect(
      page.getByRole("heading", { name: /boards/i }),
    ).toBeVisible();

    // Board view container should render
    await expect(page.getByTestId("board-view")).toBeVisible();

    // At least one column should be displayed with status headers
    const columns = page.getByTestId("board-column");
    await expect(columns.first()).toBeVisible();
    expect(await columns.count()).toBeGreaterThanOrEqual(1);

    // Default columns should include standard statuses
    await expect(page.getByText(/to do/i).first()).toBeVisible();
    await expect(page.getByText(/in progress/i).first()).toBeVisible();
    await expect(page.getByText(/done/i).first()).toBeVisible();
  });

  test.skip("should drag an issue between columns", async ({ page }) => {
    await page.goto("/boards");

    // Wait for the board to load
    await expect(page.getByTestId("board-view")).toBeVisible();

    // Find an issue card in the first column
    const sourceCard = page.getByTestId("issue-card").first();
    await expect(sourceCard).toBeVisible();

    // Get the target column (e.g., "In Progress")
    const targetColumn = page.getByTestId("board-column").nth(1);
    await expect(targetColumn).toBeVisible();

    // Perform drag and drop
    const sourceBox = await sourceCard.boundingBox();
    const targetBox = await targetColumn.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 },
      );
      await page.mouse.up();
    }

    // Verify the card moved to the target column
    const targetCards = targetColumn.getByTestId("issue-card");
    expect(await targetCards.count()).toBeGreaterThanOrEqual(1);
  });

  test.skip("should create an issue from board view", async ({ page }) => {
    await page.goto("/boards");

    // Click the create issue button or inline add button on a column
    const createButton = page.getByRole("button", { name: /create issue|add issue/i });
    await expect(createButton.first()).toBeVisible();
    await createButton.first().click();

    // A dialog or inline form should appear
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible()) {
      // Fill in the summary field
      await dialog.getByLabel(/summary/i).fill("Board issue from E2E");
      await dialog.getByRole("button", { name: /create/i }).click();
      await expect(dialog).not.toBeVisible();
    }

    // The new issue card should appear on the board
    await expect(page.getByText("Board issue from E2E")).toBeVisible();
  });
});

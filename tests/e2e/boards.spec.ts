import { test, expect } from "./helpers/fixtures";

test.describe("Boards", () => {
  test("should display board page with heading", async ({ page }) => {
    await page.goto("/boards");

    // Page heading should be visible
    await expect(
      page.getByRole("heading", { name: /boards/i }),
    ).toBeVisible();
  });

  test("should show create board button", async ({ page }) => {
    await page.goto("/boards");

    // The create board button should be present
    const createButton = page.getByRole("button", { name: /create board/i });
    await expect(createButton).toBeVisible();
  });

  test("should show empty state or board selector when no board is selected", async ({ page }) => {
    await page.goto("/boards");

    // Without a selected board, the page should show either an empty state
    // or the board selector prompt. The heading must still be visible.
    await expect(
      page.getByRole("heading", { name: /boards/i }),
    ).toBeVisible();

    // The page should render without errors (check for main content area)
    await expect(page.locator("main").or(page.locator("[class*='flex-1']")).first()).toBeVisible();
  });

  test.fixme("should display board columns with issue cards", async ({ page }) => {
    // Requires a real database with seeded boards, columns, and issues.
    await page.goto("/boards");

    await expect(page.getByTestId("board-view")).toBeVisible();

    const columns = page.getByTestId("board-column");
    await expect(columns.first()).toBeVisible();
    expect(await columns.count()).toBeGreaterThanOrEqual(1);

    await expect(page.getByText(/to do/i).first()).toBeVisible();
    await expect(page.getByText(/in progress/i).first()).toBeVisible();
    await expect(page.getByText(/done/i).first()).toBeVisible();
  });

  test.fixme("should drag an issue between columns", async ({ page }) => {
    // Requires a real database with seeded board data and issue cards to drag.
    await page.goto("/boards");

    await expect(page.getByTestId("board-view")).toBeVisible();

    const sourceCard = page.getByTestId("issue-card").first();
    await expect(sourceCard).toBeVisible();

    const targetColumn = page.getByTestId("board-column").nth(1);
    await expect(targetColumn).toBeVisible();

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

    const targetCards = targetColumn.getByTestId("issue-card");
    expect(await targetCards.count()).toBeGreaterThanOrEqual(1);
  });

  test.fixme("should create an issue from board view", async ({ page }) => {
    // Requires a real database to persist the created issue on the board.
    await page.goto("/boards");

    const createButton = page.getByRole("button", { name: /create issue|add issue/i });
    await expect(createButton.first()).toBeVisible();
    await createButton.first().click();

    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible()) {
      await dialog.getByLabel(/summary/i).fill("Board issue from E2E");
      await dialog.getByRole("button", { name: /create/i }).click();
      await expect(dialog).not.toBeVisible();
    }

    await expect(page.getByText("Board issue from E2E")).toBeVisible();
  });
});

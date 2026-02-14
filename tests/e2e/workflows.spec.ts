import { test, expect } from "./helpers/fixtures";

test.describe("Workflows", () => {
  test("workflow list page loads", async ({ page }) => {
    await page.goto("/workflows");
    await expect(
      page.getByRole("heading", { name: /workflows/i }),
    ).toBeVisible();
  });

  test("shows workflow list", async ({ page }) => {
    await page.goto("/workflows");
    await expect(page.getByTestId("workflow-list")).toBeVisible();
  });

  test("create workflow button visible", async ({ page }) => {
    await page.goto("/workflows");
    await expect(
      page.getByRole("button", { name: /create workflow/i }),
    ).toBeVisible();
  });
});

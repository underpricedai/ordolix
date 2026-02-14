import { test, expect } from "./helpers/fixtures";

test.describe("Smoke tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ordolix/);
  });

  test("navigation sidebar is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("issues page loads", async ({ page }) => {
    await page.goto("/issues");
    await expect(page.getByRole("heading", { name: /issues/i })).toBeVisible();
  });

  test("boards page loads", async ({ page }) => {
    await page.goto("/boards");
    await expect(page.getByRole("heading", { name: /boards/i })).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /settings/i }),
    ).toBeVisible();
  });
});

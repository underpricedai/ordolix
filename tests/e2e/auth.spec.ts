import { test, expect } from "@playwright/test";
import { loginAsTestUser, logout } from "./helpers/auth";

test.describe("Authentication", () => {
  test.skip("should redirect unauthenticated users to sign-in page", async ({ page }) => {
    // Ensure no auth cookies are present
    await logout(page);

    // Navigate to a protected page
    await page.goto("/issues");

    // Should be redirected to the sign-in page or show unauthorized message
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(
      page.getByRole("heading", { name: /sign in/i }),
    ).toBeVisible();
  });

  test.skip("should show user info after login", async ({ page }) => {
    // Log in with test credentials
    await loginAsTestUser(page);

    // Navigate to the app
    await page.goto("/");

    // Open the user menu
    const userMenuButton = page.getByLabel(/user menu/i);
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Should display user account information
    await expect(page.getByText(/my account/i)).toBeVisible();
    await expect(page.getByText(/profile/i)).toBeVisible();
    await expect(page.getByText(/settings/i)).toBeVisible();
  });

  test.skip("should allow logout", async ({ page }) => {
    // Log in first
    await loginAsTestUser(page);
    await page.goto("/");

    // Open the user menu
    const userMenuButton = page.getByLabel(/user menu/i);
    await userMenuButton.click();

    // Click sign out
    const signOutItem = page.getByRole("menuitem", { name: /sign out/i });
    await expect(signOutItem).toBeVisible();
    await signOutItem.click();

    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

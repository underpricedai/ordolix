import type { Page } from "@playwright/test";

/**
 * Mock authentication for E2E tests.
 * Sets auth cookies/session to bypass Azure AD login.
 */
export async function loginAsTestUser(page: Page) {
  // Set a mock session cookie for dev auth bypass
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "e2e-test-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function loginAsAdmin(page: Page) {
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "e2e-admin-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

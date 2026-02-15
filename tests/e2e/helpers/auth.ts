import type { Page } from "@playwright/test";

/**
 * Log in as the default test user (Frank Admin) for E2E tests.
 * In dev mode, tRPC context uses createDevSession() which reads the
 * dev-user-id cookie to determine the active user.
 */
export async function loginAsTestUser(page: Page) {
  // Set the dev-user-id cookie used by createDevSession() in dev mode.
  // Without a specific user ID, createDevSession() falls back to the
  // first user in the DB — which is Frank Admin after seeding.
  await page.context().addCookies([
    {
      name: "dev-user-id",
      value: "first-user",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function loginAsAdmin(page: Page) {
  // Same as test user — Frank Admin is the first user and has admin role.
  await loginAsTestUser(page);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

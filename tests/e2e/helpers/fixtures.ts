import { test as base } from "@playwright/test";
import { loginAsTestUser } from "./auth";

/**
 * Extended test fixtures for Ordolix E2E tests.
 * Provides authenticated pages and common test utilities.
 */
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  // Automatically log in before each test that uses this fixture
  page: async ({ page }, callback) => {
    await loginAsTestUser(page);
    await callback(page);
  },
});

export { expect } from "@playwright/test";

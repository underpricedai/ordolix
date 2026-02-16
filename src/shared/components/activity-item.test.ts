import { describe, it, expect } from "vitest";
import { ActivityItem } from "./activity-item";

/**
 * Tests for the ActivityItem component.
 *
 * @description Smoke tests verifying the component exports correctly
 * and is a valid React function component. Detailed interaction and
 * rendering tests are deferred to E2E (Playwright).
 */
describe("ActivityItem", () => {
  it("should be exported as a function", () => {
    expect(typeof ActivityItem).toBe("function");
  });

  it("should have the correct function name", () => {
    expect(ActivityItem.name).toBe("ActivityItem");
  });
});

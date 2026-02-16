import { describe, it, expect } from "vitest";
import { AttachmentList } from "./attachment-list";

/**
 * Tests for the AttachmentList component.
 *
 * @description Smoke tests verifying the component exports correctly.
 * Full interaction tests (delete, confirm, loading states) are deferred
 * to E2E (Playwright) since they require tRPC context and query mocking.
 */
describe("AttachmentList", () => {
  it("should be exported as a function", () => {
    expect(typeof AttachmentList).toBe("function");
  });

  it("should have the correct function name", () => {
    expect(AttachmentList.name).toBe("AttachmentList");
  });
});

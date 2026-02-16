import { describe, it, expect } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

/**
 * Tests for the RichTextEditor component.
 *
 * @description Minimal smoke tests verifying the component exports correctly.
 * The component is a UI wrapper around Tiptap, so detailed interaction tests
 * are deferred to E2E (Playwright) rather than unit tests.
 */
describe("RichTextEditor", () => {
  it("should be exported as a function", () => {
    expect(typeof RichTextEditor).toBe("function");
  });

  it("should have the correct display name inferred from function name", () => {
    expect(RichTextEditor.name).toBe("RichTextEditor");
  });
});

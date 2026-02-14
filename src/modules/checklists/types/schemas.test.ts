import { describe, expect, it } from "vitest";
import {
  createChecklistInput,
  updateChecklistInput,
  addChecklistItemInput,
  updateChecklistItemInput,
  getChecklistsInput,
} from "./schemas";

describe("createChecklistInput", () => {
  it("accepts valid minimal input", () => {
    const result = createChecklistInput.safeParse({
      issueId: "issue-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with optional fields", () => {
    const result = createChecklistInput.safeParse({
      issueId: "issue-1",
      title: "Release Checklist",
      position: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing issueId", () => {
    const result = createChecklistInput.safeParse({
      title: "Checklist",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty issueId", () => {
    const result = createChecklistInput.safeParse({
      issueId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateChecklistInput", () => {
  it("accepts id only", () => {
    const result = updateChecklistInput.safeParse({ id: "cl-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateChecklistInput.safeParse({
      id: "cl-1",
      title: "Renamed",
      position: 3,
    });
    expect(result.success).toBe(true);
  });
});

describe("addChecklistItemInput", () => {
  it("accepts valid minimal input", () => {
    const result = addChecklistItemInput.safeParse({
      checklistId: "cl-1",
      text: "Do something",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with all optional fields", () => {
    const result = addChecklistItemInput.safeParse({
      checklistId: "cl-1",
      text: "Review PR",
      assigneeId: "user-1",
      dueDate: "2026-03-01T00:00:00Z",
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing text", () => {
    const result = addChecklistItemInput.safeParse({
      checklistId: "cl-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty checklistId", () => {
    const result = addChecklistItemInput.safeParse({
      checklistId: "",
      text: "Item",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateChecklistItemInput", () => {
  it("accepts id only", () => {
    const result = updateChecklistItemInput.safeParse({ id: "item-1" });
    expect(result.success).toBe(true);
  });

  it("accepts toggling isChecked", () => {
    const result = updateChecklistItemInput.safeParse({
      id: "item-1",
      isChecked: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable assigneeId", () => {
    const result = updateChecklistItemInput.safeParse({
      id: "item-1",
      assigneeId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("getChecklistsInput", () => {
  it("accepts valid input", () => {
    const result = getChecklistsInput.safeParse({ issueId: "issue-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty issueId", () => {
    const result = getChecklistsInput.safeParse({ issueId: "" });
    expect(result.success).toBe(false);
  });
});

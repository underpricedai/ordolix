import { describe, expect, it } from "vitest";
import { createIssueInput, updateIssueInput, listIssuesInput } from "./schemas";

describe("createIssueInput", () => {
  const validInput = {
    projectId: "proj-1",
    summary: "Test issue",
    issueTypeId: "type-1",
  };

  it("accepts valid minimal input", () => {
    const result = createIssueInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid full input", () => {
    const result = createIssueInput.safeParse({
      ...validInput,
      description: "A description",
      priorityId: "pri-1",
      assigneeId: "user-1",
      parentId: "issue-1",
      sprintId: "sprint-1",
      labels: ["bug", "urgent"],
      storyPoints: 5,
      dueDate: "2026-03-01",
      startDate: "2026-02-15",
      customFieldValues: { team: "platform" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = createIssueInput.safeParse({
      summary: "Test",
      issueTypeId: "type-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing summary", () => {
    const result = createIssueInput.safeParse({
      projectId: "proj-1",
      issueTypeId: "type-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty summary", () => {
    const result = createIssueInput.safeParse({
      ...validInput,
      summary: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects summary over 255 chars", () => {
    const result = createIssueInput.safeParse({
      ...validInput,
      summary: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing issueTypeId", () => {
    const result = createIssueInput.safeParse({
      projectId: "proj-1",
      summary: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("defaults labels to empty array", () => {
    const result = createIssueInput.parse(validInput);
    expect(result.labels).toEqual([]);
  });

  it("defaults customFieldValues to empty object", () => {
    const result = createIssueInput.parse(validInput);
    expect(result.customFieldValues).toEqual({});
  });

  it("rejects negative storyPoints", () => {
    const result = createIssueInput.safeParse({
      ...validInput,
      storyPoints: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateIssueInput", () => {
  it("accepts valid update with id only", () => {
    const result = updateIssueInput.safeParse({ id: "issue-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateIssueInput.safeParse({
      id: "issue-1",
      summary: "Updated summary",
      priorityId: "pri-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateIssueInput.safeParse({ summary: "Updated" });
    expect(result.success).toBe(false);
  });

  it("allows nullable fields", () => {
    const result = updateIssueInput.safeParse({
      id: "issue-1",
      assigneeId: null,
      description: null,
      storyPoints: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("listIssuesInput", () => {
  it("accepts valid minimal input", () => {
    const result = listIssuesInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("defaults limit to 50", () => {
    const result = listIssuesInput.parse({ projectId: "proj-1" });
    expect(result.limit).toBe(50);
  });

  it("defaults sortBy to createdAt", () => {
    const result = listIssuesInput.parse({ projectId: "proj-1" });
    expect(result.sortBy).toBe("createdAt");
  });

  it("defaults sortOrder to desc", () => {
    const result = listIssuesInput.parse({ projectId: "proj-1" });
    expect(result.sortOrder).toBe("desc");
  });

  it("rejects limit below 1", () => {
    const result = listIssuesInput.safeParse({
      projectId: "proj-1",
      limit: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 100", () => {
    const result = listIssuesInput.safeParse({
      projectId: "proj-1",
      limit: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortBy", () => {
    const result = listIssuesInput.safeParse({
      projectId: "proj-1",
      sortBy: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all filter params", () => {
    const result = listIssuesInput.safeParse({
      projectId: "proj-1",
      statusId: "status-1",
      assigneeId: "user-1",
      issueTypeId: "type-1",
      search: "bug fix",
      cursor: "cursor-abc",
      limit: 25,
      sortBy: "updatedAt",
      sortOrder: "asc",
    });
    expect(result.success).toBe(true);
  });
});

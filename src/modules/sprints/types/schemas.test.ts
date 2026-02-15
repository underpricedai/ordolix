import { describe, expect, it } from "vitest";
import {
  createSprintInput,
  updateSprintInput,
  listSprintsInput,
  startSprintInput,
  completeSprintInput,
  addIssuesToSprintInput,
  removeIssuesFromSprintInput,
  getVelocityInput,
} from "./schemas";

describe("createSprintInput", () => {
  it("accepts valid input with all fields", () => {
    const result = createSprintInput.safeParse({
      projectId: "proj-1",
      name: "Sprint 1",
      goal: "Finish auth module",
      startDate: "2026-03-01",
      endDate: "2026-03-14",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal input with only projectId", () => {
    const result = createSprintInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = createSprintInput.safeParse({ name: "Sprint 1" });
    expect(result.success).toBe(false);
  });

  it("rejects empty projectId", () => {
    const result = createSprintInput.safeParse({ projectId: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateSprintInput", () => {
  it("accepts valid update with partial fields", () => {
    const result = updateSprintInput.safeParse({
      id: "sprint-1",
      name: "Sprint 1 Updated",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateSprintInput.safeParse({ name: "Sprint 1" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = updateSprintInput.safeParse({
      id: "sprint-1",
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("listSprintsInput", () => {
  it("accepts projectId with optional status filter", () => {
    const result = listSprintsInput.safeParse({
      projectId: "proj-1",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("accepts projectId without status filter", () => {
    const result = listSprintsInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
  });
});

describe("startSprintInput", () => {
  it("accepts valid input with endDate", () => {
    const result = startSprintInput.safeParse({
      id: "sprint-1",
      endDate: "2026-03-14",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing endDate", () => {
    const result = startSprintInput.safeParse({ id: "sprint-1" });
    expect(result.success).toBe(false);
  });
});

describe("completeSprintInput", () => {
  it("accepts id with optional moveToSprintId", () => {
    const result = completeSprintInput.safeParse({
      id: "sprint-1",
      moveToSprintId: "sprint-2",
    });
    expect(result.success).toBe(true);
  });

  it("accepts id without moveToSprintId", () => {
    const result = completeSprintInput.safeParse({ id: "sprint-1" });
    expect(result.success).toBe(true);
  });
});

describe("addIssuesToSprintInput", () => {
  it("accepts valid sprintId and issueIds", () => {
    const result = addIssuesToSprintInput.safeParse({
      sprintId: "sprint-1",
      issueIds: ["issue-1", "issue-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty issueIds array", () => {
    const result = addIssuesToSprintInput.safeParse({
      sprintId: "sprint-1",
      issueIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("removeIssuesFromSprintInput", () => {
  it("accepts valid sprintId and issueIds", () => {
    const result = removeIssuesFromSprintInput.safeParse({
      sprintId: "sprint-1",
      issueIds: ["issue-1"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty issueIds array", () => {
    const result = removeIssuesFromSprintInput.safeParse({
      sprintId: "sprint-1",
      issueIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("getVelocityInput", () => {
  it("accepts projectId with default sprintCount", () => {
    const result = getVelocityInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sprintCount).toBe(10);
    }
  });

  it("accepts custom sprintCount", () => {
    const result = getVelocityInput.safeParse({
      projectId: "proj-1",
      sprintCount: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sprintCount).toBe(5);
    }
  });
});

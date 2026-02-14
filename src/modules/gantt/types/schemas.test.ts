import { describe, expect, it } from "vitest";
import { addDependencyInput, removeDependencyInput, getGanttDataInput } from "./schemas";

describe("addDependencyInput", () => {
  it("accepts valid input with all fields", () => {
    const result = addDependencyInput.parse({
      sourceIssueId: "issue-1",
      targetIssueId: "issue-2",
      dependencyType: "FF",
      lag: 3,
    });

    expect(result.sourceIssueId).toBe("issue-1");
    expect(result.targetIssueId).toBe("issue-2");
    expect(result.dependencyType).toBe("FF");
    expect(result.lag).toBe(3);
  });

  it("defaults dependencyType to FS and lag to 0", () => {
    const result = addDependencyInput.parse({
      sourceIssueId: "issue-1",
      targetIssueId: "issue-2",
    });

    expect(result.dependencyType).toBe("FS");
    expect(result.lag).toBe(0);
  });

  it("rejects invalid dependencyType", () => {
    expect(() =>
      addDependencyInput.parse({
        sourceIssueId: "issue-1",
        targetIssueId: "issue-2",
        dependencyType: "INVALID",
      }),
    ).toThrow();
  });

  it("rejects empty sourceIssueId", () => {
    expect(() =>
      addDependencyInput.parse({
        sourceIssueId: "",
        targetIssueId: "issue-2",
      }),
    ).toThrow();
  });
});

describe("removeDependencyInput", () => {
  it("accepts valid input", () => {
    const result = removeDependencyInput.parse({ id: "dep-1" });
    expect(result.id).toBe("dep-1");
  });

  it("rejects empty id", () => {
    expect(() => removeDependencyInput.parse({ id: "" })).toThrow();
  });
});

describe("getGanttDataInput", () => {
  it("accepts valid projectId", () => {
    const result = getGanttDataInput.parse({ projectId: "proj-1" });
    expect(result.projectId).toBe("proj-1");
  });

  it("rejects empty projectId", () => {
    expect(() => getGanttDataInput.parse({ projectId: "" })).toThrow();
  });
});

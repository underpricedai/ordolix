import { describe, expect, it } from "vitest";
import {
  transitionIssueInput,
  getAvailableTransitionsInput,
  getWorkflowForProjectInput,
  validatorConfig,
} from "./schemas";

describe("transitionIssueInput", () => {
  it("accepts valid input", () => {
    const result = transitionIssueInput.safeParse({
      issueId: "issue-1",
      transitionId: "trans-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing issueId", () => {
    const result = transitionIssueInput.safeParse({
      transitionId: "trans-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing transitionId", () => {
    const result = transitionIssueInput.safeParse({
      issueId: "issue-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("getAvailableTransitionsInput", () => {
  it("accepts valid input", () => {
    const result = getAvailableTransitionsInput.safeParse({
      issueId: "issue-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("getWorkflowForProjectInput", () => {
  it("accepts valid input", () => {
    const result = getWorkflowForProjectInput.safeParse({
      projectId: "proj-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("validatorConfig", () => {
  it("defaults config to empty object", () => {
    const result = validatorConfig.parse({ type: "required_field" });
    expect(result.config).toEqual({});
  });
});

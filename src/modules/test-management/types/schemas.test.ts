import { describe, expect, it } from "vitest";
import {
  createTestSuiteInput,
  createTestCaseInput,
  updateTestCaseInput,
  listTestCasesInput,
  createTestRunInput,
  updateTestRunStatusInput,
  recordTestResultInput,
  listTestRunsInput,
} from "./schemas";

describe("createTestSuiteInput", () => {
  it("accepts valid input", () => {
    const result = createTestSuiteInput.safeParse({ name: "Login Tests" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createTestSuiteInput.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("createTestCaseInput", () => {
  it("accepts valid input with defaults", () => {
    const result = createTestCaseInput.parse({
      testSuiteId: "suite-1",
      title: "Login with valid credentials",
    });
    expect(result.priority).toBe("medium");
    expect(result.status).toBe("draft");
    expect(result.steps).toEqual([]);
  });

  it("accepts steps array", () => {
    const result = createTestCaseInput.safeParse({
      testSuiteId: "suite-1",
      title: "Test",
      steps: [{ step: "Click login", expectedResult: "Form appears" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid priority", () => {
    const result = createTestCaseInput.safeParse({
      testSuiteId: "suite-1",
      title: "Test",
      priority: "urgent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = createTestCaseInput.safeParse({
      testSuiteId: "suite-1",
      title: "Test",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTestCaseInput", () => {
  it("accepts partial update", () => {
    const result = updateTestCaseInput.safeParse({
      id: "tc-1",
      priority: "high",
    });
    expect(result.success).toBe(true);
  });
});

describe("listTestCasesInput", () => {
  it("accepts filters", () => {
    const result = listTestCasesInput.safeParse({
      testSuiteId: "suite-1",
      priority: "critical",
      status: "ready",
    });
    expect(result.success).toBe(true);
  });
});

describe("createTestRunInput", () => {
  it("accepts valid input", () => {
    const result = createTestRunInput.safeParse({
      name: "Sprint 5 Regression",
      testCaseIds: ["tc-1", "tc-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty testCaseIds", () => {
    const result = createTestRunInput.safeParse({
      name: "Run",
      testCaseIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTestRunStatusInput", () => {
  it("accepts valid status", () => {
    const result = updateTestRunStatusInput.safeParse({
      id: "run-1",
      status: "in_progress",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateTestRunStatusInput.safeParse({
      id: "run-1",
      status: "running",
    });
    expect(result.success).toBe(false);
  });
});

describe("recordTestResultInput", () => {
  it("accepts valid result", () => {
    const result = recordTestResultInput.safeParse({
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "passed",
    });
    expect(result.success).toBe(true);
  });

  it("accepts result with comment and duration", () => {
    const result = recordTestResultInput.safeParse({
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "failed",
      comment: "Button not clickable",
      duration: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = recordTestResultInput.safeParse({
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "error",
    });
    expect(result.success).toBe(false);
  });
});

describe("listTestRunsInput", () => {
  it("defaults limit to 50", () => {
    const result = listTestRunsInput.parse({});
    expect(result.limit).toBe(50);
  });
});

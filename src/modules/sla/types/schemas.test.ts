import { describe, expect, it } from "vitest";
import {
  createSLAConfigInput,
  updateSLAConfigInput,
  listSLAConfigsInput,
  startSLAInput,
  pauseSLAInput,
  resumeSLAInput,
  completeSLAInput,
  getSLAInstancesInput,
} from "./schemas";

describe("createSLAConfigInput", () => {
  it("accepts valid input", () => {
    const result = createSLAConfigInput.safeParse({
      name: "Response SLA",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_response" },
    });
    expect(result.success).toBe(true);
  });

  it("defaults isActive to true", () => {
    const result = createSLAConfigInput.parse({
      name: "Response SLA",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_response" },
    });
    expect(result.isActive).toBe(true);
  });

  it("defaults pauseConditions to empty array", () => {
    const result = createSLAConfigInput.parse({
      name: "Response SLA",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_response" },
    });
    expect(result.pauseConditions).toEqual([]);
  });

  it("rejects empty name", () => {
    const result = createSLAConfigInput.safeParse({
      name: "",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: {},
      stopCondition: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = createSLAConfigInput.safeParse({
      name: "x".repeat(256),
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: {},
      stopCondition: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid metric", () => {
    const result = createSLAConfigInput.safeParse({
      name: "SLA",
      metric: "invalid_metric",
      targetDuration: 60,
      startCondition: {},
      stopCondition: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive targetDuration", () => {
    const result = createSLAConfigInput.safeParse({
      name: "SLA",
      metric: "time_to_resolution",
      targetDuration: 0,
      startCondition: {},
      stopCondition: {},
    });
    expect(result.success).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = createSLAConfigInput.safeParse({
      name: "Full SLA",
      metric: "time_to_close",
      targetDuration: 120,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "issue_closed" },
      projectId: "proj-1",
      pauseConditions: [{ status: "on_hold" }],
      calendar: { timezone: "UTC", hours: "9-17" },
      escalationRules: [{ after: 30, notify: "manager" }],
      isActive: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateSLAConfigInput", () => {
  it("accepts id with partial fields", () => {
    const result = updateSLAConfigInput.safeParse({
      id: "sla-1",
      name: "Updated SLA",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateSLAConfigInput.safeParse({ name: "Updated" });
    expect(result.success).toBe(false);
  });
});

describe("listSLAConfigsInput", () => {
  it("accepts empty object", () => {
    const result = listSLAConfigsInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts isActive filter", () => {
    const result = listSLAConfigsInput.safeParse({ isActive: true });
    expect(result.success).toBe(true);
  });
});

describe("startSLAInput", () => {
  it("accepts valid input", () => {
    const result = startSLAInput.safeParse({
      slaConfigId: "config-1",
      issueId: "issue-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing issueId", () => {
    const result = startSLAInput.safeParse({ slaConfigId: "config-1" });
    expect(result.success).toBe(false);
  });
});

describe("pauseSLAInput", () => {
  it("accepts valid instanceId", () => {
    const result = pauseSLAInput.safeParse({ instanceId: "inst-1" });
    expect(result.success).toBe(true);
  });
});

describe("resumeSLAInput", () => {
  it("accepts valid instanceId", () => {
    const result = resumeSLAInput.safeParse({ instanceId: "inst-1" });
    expect(result.success).toBe(true);
  });
});

describe("completeSLAInput", () => {
  it("accepts valid instanceId", () => {
    const result = completeSLAInput.safeParse({ instanceId: "inst-1" });
    expect(result.success).toBe(true);
  });
});

describe("getSLAInstancesInput", () => {
  it("accepts issueId only", () => {
    const result = getSLAInstancesInput.safeParse({ issueId: "issue-1" });
    expect(result.success).toBe(true);
  });

  it("accepts optional status filter", () => {
    const result = getSLAInstancesInput.safeParse({
      issueId: "issue-1",
      status: "breached",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = getSLAInstancesInput.safeParse({
      issueId: "issue-1",
      status: "unknown",
    });
    expect(result.success).toBe(false);
  });
});

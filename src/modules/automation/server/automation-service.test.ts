import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
  evaluateConditions,
  executeRule,
} from "./automation-service";
import { NotFoundError } from "@/server/lib/errors";

function createMockDb() {
  return {
    automationRule: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: { findFirst: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockRule = {
  id: "rule-1",
  organizationId: ORG_ID,
  projectId: null,
  name: "Auto-assign",
  description: null,
  trigger: { type: "issue_created", config: {} },
  conditions: [{ field: "priority", operator: "equals", value: "high" }],
  actions: [
    { type: "set_field", config: { field: "assignee", value: "user-2" } },
  ],
  enabled: true,
  executionCount: 0,
  lastExecutedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockIssue = {
  id: "issue-1",
  organizationId: ORG_ID,
  priority: "high",
  status: "open",
  summary: "Test issue",
  deletedAt: null,
};

// ── createRule ──────────────────────────────────────────────────────────────

describe("createRule", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.create.mockResolvedValue(mockRule);
  });

  it("creates an automation rule", async () => {
    const result = await createRule(db, ORG_ID, USER_ID, {
      name: "Auto-assign",
      trigger: { type: "issue_created", config: {} },
      actions: [{ type: "set_field", config: { field: "assignee", value: "user-2" } }],
      isActive: true,
    });

    expect(result.id).toBe("rule-1");
    expect(db.automationRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Auto-assign",
      }),
    });
  });
});

// ── getRule ──────────────────────────────────────────────────────────────────

describe("getRule", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.findFirst.mockResolvedValue(mockRule);
  });

  it("returns rule by id", async () => {
    const result = await getRule(db, ORG_ID, "rule-1");
    expect(result.id).toBe("rule-1");
    expect(db.automationRule.findFirst).toHaveBeenCalledWith({
      where: { id: "rule-1", organizationId: ORG_ID },
    });
  });

  it("throws NotFoundError if rule not found", async () => {
    db.automationRule.findFirst.mockResolvedValue(null);
    await expect(getRule(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listRules ───────────────────────────────────────────────────────────────

describe("listRules", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.findMany.mockResolvedValue([mockRule]);
  });

  it("returns rules for organization", async () => {
    const result = await listRules(db, ORG_ID, {});
    expect(result).toHaveLength(1);
    expect(db.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
      }),
    );
  });

  it("filters by projectId and isActive", async () => {
    await listRules(db, ORG_ID, { projectId: "proj-1", isActive: true });
    expect(db.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, projectId: "proj-1", enabled: true },
      }),
    );
  });

  it("filters by trigger type using JSON path", async () => {
    await listRules(db, ORG_ID, { triggerType: "scheduled" });
    expect(db.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          trigger: { path: ["type"], equals: "scheduled" },
        },
      }),
    );
  });
});

// ── updateRule ───────────────────────────────────────────────────────────────

describe("updateRule", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.findFirst.mockResolvedValue(mockRule);
    db.automationRule.update.mockResolvedValue({
      ...mockRule,
      enabled: false,
    });
  });

  it("updates an existing rule", async () => {
    const result = await updateRule(db, ORG_ID, "rule-1", {
      id: "rule-1",
      isActive: false,
    });

    expect(result.enabled).toBe(false);
    expect(db.automationRule.update).toHaveBeenCalledWith({
      where: { id: "rule-1" },
      data: expect.objectContaining({ enabled: false }),
    });
  });

  it("throws NotFoundError if rule not found", async () => {
    db.automationRule.findFirst.mockResolvedValue(null);
    await expect(
      updateRule(db, ORG_ID, "nope", { id: "nope", name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteRule ───────────────────────────────────────────────────────────────

describe("deleteRule", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.findFirst.mockResolvedValue(mockRule);
    db.automationRule.delete.mockResolvedValue(mockRule);
  });

  it("deletes an existing rule", async () => {
    const result = await deleteRule(db, ORG_ID, "rule-1");
    expect(result.id).toBe("rule-1");
    expect(db.automationRule.delete).toHaveBeenCalledWith({
      where: { id: "rule-1" },
    });
  });

  it("throws NotFoundError if rule not found", async () => {
    db.automationRule.findFirst.mockResolvedValue(null);
    await expect(deleteRule(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── evaluateConditions ──────────────────────────────────────────────────────

describe("evaluateConditions", () => {
  const issue = {
    priority: "high",
    status: "open",
    summary: "Critical bug in production",
    labels: ["bug", "urgent"],
  };

  it("returns true when no conditions", () => {
    expect(evaluateConditions(issue, [])).toBe(true);
  });

  it("evaluates equals operator", () => {
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "equals", value: "high" },
      ]),
    ).toBe(true);
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "equals", value: "low" },
      ]),
    ).toBe(false);
  });

  it("evaluates not_equals operator", () => {
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "not_equals", value: "low" },
      ]),
    ).toBe(true);
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "not_equals", value: "high" },
      ]),
    ).toBe(false);
  });

  it("evaluates contains operator", () => {
    expect(
      evaluateConditions(issue, [
        { field: "summary", operator: "contains", value: "Critical" },
      ]),
    ).toBe(true);
    expect(
      evaluateConditions(issue, [
        { field: "summary", operator: "contains", value: "minor" },
      ]),
    ).toBe(false);
  });

  it("evaluates in operator", () => {
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "in", value: ["high", "critical"] },
      ]),
    ).toBe(true);
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "in", value: ["low", "medium"] },
      ]),
    ).toBe(false);
  });

  it("returns false for unknown operator", () => {
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "unknown_op", value: "high" },
      ]),
    ).toBe(false);
  });

  it("requires all conditions to match (AND logic)", () => {
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "equals", value: "high" },
        { field: "status", operator: "equals", value: "open" },
      ]),
    ).toBe(true);
    expect(
      evaluateConditions(issue, [
        { field: "priority", operator: "equals", value: "high" },
        { field: "status", operator: "equals", value: "closed" },
      ]),
    ).toBe(false);
  });
});

// ── executeRule ──────────────────────────────────────────────────────────────

describe("executeRule", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.automationRule.findFirst.mockResolvedValue(mockRule);
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.automationRule.update.mockResolvedValue({
      ...mockRule,
      executionCount: 1,
      lastExecutedAt: new Date(),
    });
  });

  it("executes rule when conditions pass", async () => {
    const result = await executeRule(db, ORG_ID, "rule-1", "issue-1");

    expect(result.executed).toBe(true);
    expect(result.actionsRun).toBe(1);
    expect(db.automationRule.update).toHaveBeenCalledWith({
      where: { id: "rule-1" },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: expect.any(Date),
      },
    });
  });

  it("returns not executed when conditions fail", async () => {
    db.issue.findFirst.mockResolvedValue({ ...mockIssue, priority: "low" });

    const result = await executeRule(db, ORG_ID, "rule-1", "issue-1");

    expect(result.executed).toBe(false);
    expect(result.reason).toBe("conditions_not_met");
    expect(db.automationRule.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundError if rule not found", async () => {
    db.automationRule.findFirst.mockResolvedValue(null);

    await expect(
      executeRule(db, ORG_ID, "nope", "issue-1"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      executeRule(db, ORG_ID, "rule-1", "nope"),
    ).rejects.toThrow(NotFoundError);
  });
});

import { describe, expect, it } from "vitest";
import {
  triggerTypeEnum,
  actionTypeEnum,
  triggerSchema,
  conditionSchema,
  actionSchema,
  createAutomationRuleInput,
  updateAutomationRuleInput,
  listAutomationRulesInput,
  executeRuleInput,
} from "./schemas";

// ── triggerTypeEnum ─────────────────────────────────────────────────────────

describe("triggerTypeEnum", () => {
  it("accepts valid trigger types", () => {
    expect(triggerTypeEnum.parse("issue_created")).toBe("issue_created");
    expect(triggerTypeEnum.parse("status_changed")).toBe("status_changed");
    expect(triggerTypeEnum.parse("field_updated")).toBe("field_updated");
    expect(triggerTypeEnum.parse("scheduled")).toBe("scheduled");
  });

  it("rejects invalid trigger types", () => {
    expect(() => triggerTypeEnum.parse("invalid")).toThrow();
  });
});

// ── actionTypeEnum ──────────────────────────────────────────────────────────

describe("actionTypeEnum", () => {
  it("accepts valid action types", () => {
    expect(actionTypeEnum.parse("set_field")).toBe("set_field");
    expect(actionTypeEnum.parse("add_comment")).toBe("add_comment");
    expect(actionTypeEnum.parse("send_email")).toBe("send_email");
    expect(actionTypeEnum.parse("transition")).toBe("transition");
  });

  it("rejects invalid action types", () => {
    expect(() => actionTypeEnum.parse("invalid")).toThrow();
  });
});

// ── triggerSchema ───────────────────────────────────────────────────────────

describe("triggerSchema", () => {
  it("parses a valid trigger with config", () => {
    const result = triggerSchema.parse({
      type: "status_changed",
      config: { fromStatus: "open", toStatus: "closed" },
    });
    expect(result.type).toBe("status_changed");
    expect(result.config).toEqual({ fromStatus: "open", toStatus: "closed" });
  });

  it("defaults config to empty object", () => {
    const result = triggerSchema.parse({ type: "issue_created" });
    expect(result.config).toEqual({});
  });
});

// ── conditionSchema ─────────────────────────────────────────────────────────

describe("conditionSchema", () => {
  it("parses a valid condition", () => {
    const result = conditionSchema.parse({
      field: "priority",
      operator: "equals",
      value: "high",
    });
    expect(result.field).toBe("priority");
    expect(result.operator).toBe("equals");
    expect(result.value).toBe("high");
  });

  it("rejects condition without field", () => {
    expect(() =>
      conditionSchema.parse({ operator: "equals", value: "high" }),
    ).toThrow();
  });
});

// ── actionSchema ────────────────────────────────────────────────────────────

describe("actionSchema", () => {
  it("parses a valid action", () => {
    const result = actionSchema.parse({
      type: "set_field",
      config: { field: "assignee", value: "user-1" },
    });
    expect(result.type).toBe("set_field");
    expect(result.config).toEqual({ field: "assignee", value: "user-1" });
  });

  it("rejects action with invalid type", () => {
    expect(() =>
      actionSchema.parse({ type: "unknown_action", config: {} }),
    ).toThrow();
  });
});

// ── createAutomationRuleInput ───────────────────────────────────────────────

describe("createAutomationRuleInput", () => {
  const validInput = {
    name: "Auto-assign on create",
    trigger: { type: "issue_created" as const },
    actions: [{ type: "set_field" as const, config: { field: "assignee", value: "user-1" } }],
  };

  it("parses a valid create input", () => {
    const result = createAutomationRuleInput.parse(validInput);
    expect(result.name).toBe("Auto-assign on create");
    expect(result.isActive).toBe(true);
    expect(result.actions).toHaveLength(1);
  });

  it("rejects empty name", () => {
    expect(() =>
      createAutomationRuleInput.parse({ ...validInput, name: "" }),
    ).toThrow();
  });

  it("rejects name longer than 255 characters", () => {
    expect(() =>
      createAutomationRuleInput.parse({ ...validInput, name: "x".repeat(256) }),
    ).toThrow();
  });

  it("rejects empty actions array", () => {
    expect(() =>
      createAutomationRuleInput.parse({ ...validInput, actions: [] }),
    ).toThrow();
  });
});

// ── updateAutomationRuleInput ───────────────────────────────────────────────

describe("updateAutomationRuleInput", () => {
  it("requires id", () => {
    expect(() => updateAutomationRuleInput.parse({})).toThrow();
  });

  it("accepts partial updates", () => {
    const result = updateAutomationRuleInput.parse({
      id: "rule-1",
      isActive: false,
    });
    expect(result.id).toBe("rule-1");
    expect(result.isActive).toBe(false);
    expect(result.name).toBeUndefined();
  });
});

// ── listAutomationRulesInput ────────────────────────────────────────────────

describe("listAutomationRulesInput", () => {
  it("accepts empty input", () => {
    const result = listAutomationRulesInput.parse({});
    expect(result.projectId).toBeUndefined();
    expect(result.isActive).toBeUndefined();
    expect(result.triggerType).toBeUndefined();
  });

  it("accepts all filters", () => {
    const result = listAutomationRulesInput.parse({
      projectId: "proj-1",
      isActive: true,
      triggerType: "scheduled",
    });
    expect(result.triggerType).toBe("scheduled");
  });
});

// ── executeRuleInput ────────────────────────────────────────────────────────

describe("executeRuleInput", () => {
  it("parses valid input", () => {
    const result = executeRuleInput.parse({
      ruleId: "rule-1",
      issueId: "issue-1",
    });
    expect(result.ruleId).toBe("rule-1");
    expect(result.issueId).toBe("issue-1");
  });

  it("rejects missing ruleId", () => {
    expect(() => executeRuleInput.parse({ issueId: "issue-1" })).toThrow();
  });
});

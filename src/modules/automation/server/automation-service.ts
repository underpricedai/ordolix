import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  ListAutomationRulesInput,
  Condition,
} from "../types/schemas";

export async function createRule(
  db: PrismaClient,
  organizationId: string,
  _userId: string,
  input: CreateAutomationRuleInput,
) {
  return db.automationRule.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      trigger: input.trigger as unknown as Prisma.InputJsonValue,
      conditions: (input.conditions ?? []) as unknown as Prisma.InputJsonValue,
      actions: input.actions as unknown as Prisma.InputJsonValue,
      projectId: input.projectId,
      enabled: input.isActive,
    },
  });
}

export async function getRule(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const rule = await db.automationRule.findFirst({
    where: { id, organizationId },
  });
  if (!rule) {
    throw new NotFoundError("AutomationRule", id);
  }
  return rule;
}

export async function listRules(
  db: PrismaClient,
  organizationId: string,
  input: ListAutomationRulesInput,
) {
  const where: Record<string, unknown> = { organizationId };

  if (input.projectId !== undefined) {
    where.projectId = input.projectId;
  }
  if (input.isActive !== undefined) {
    where.enabled = input.isActive;
  }
  if (input.triggerType !== undefined) {
    where.trigger = { path: ["type"], equals: input.triggerType };
  }

  return db.automationRule.findMany({
    where,
    orderBy: { createdAt: "desc" as const },
  });
}

export async function updateRule(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: UpdateAutomationRuleInput,
) {
  const existing = await db.automationRule.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("AutomationRule", id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, isActive, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (isActive !== undefined) {
    data.enabled = isActive;
  }
  if (rest.trigger) {
    data.trigger = rest.trigger as unknown as Prisma.InputJsonValue;
  }
  if (rest.conditions) {
    data.conditions = rest.conditions as unknown as Prisma.InputJsonValue;
  }
  if (rest.actions) {
    data.actions = rest.actions as unknown as Prisma.InputJsonValue;
  }

  return db.automationRule.update({
    where: { id },
    data,
  });
}

export async function deleteRule(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.automationRule.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("AutomationRule", id);
  }

  return db.automationRule.delete({ where: { id } });
}

export function evaluateConditions(
  issue: Record<string, unknown>,
  conditions: Condition[],
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => {
    const fieldValue = issue[condition.field];

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "contains":
        return (
          typeof fieldValue === "string" &&
          typeof condition.value === "string" &&
          fieldValue.includes(condition.value)
        );
      case "in":
        return (
          Array.isArray(condition.value) &&
          condition.value.includes(fieldValue)
        );
      default:
        return false;
    }
  });
}

export async function executeRule(
  db: PrismaClient,
  organizationId: string,
  ruleId: string,
  issueId: string,
) {
  const rule = await db.automationRule.findFirst({
    where: { id: ruleId, organizationId },
  });
  if (!rule) {
    throw new NotFoundError("AutomationRule", ruleId);
  }

  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const conditions = (rule.conditions ?? []) as Condition[];
  const issueData = issue as unknown as Record<string, unknown>;

  if (!evaluateConditions(issueData, conditions)) {
    return { executed: false, reason: "conditions_not_met" } as const;
  }

  const actions = rule.actions as unknown[];

  await db.automationRule.update({
    where: { id: ruleId },
    data: {
      executionCount: { increment: 1 },
      lastExecutedAt: new Date(),
    },
  });

  return { executed: true, actionsRun: actions.length } as const;
}

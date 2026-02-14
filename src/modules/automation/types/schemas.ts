import { z } from "zod";

export const triggerTypeEnum = z.enum([
  "issue_created",
  "status_changed",
  "field_updated",
  "scheduled",
]);

export type TriggerType = z.infer<typeof triggerTypeEnum>;

export const actionTypeEnum = z.enum([
  "set_field",
  "add_comment",
  "send_email",
  "transition",
]);

export type ActionType = z.infer<typeof actionTypeEnum>;

export const triggerSchema = z.object({
  type: triggerTypeEnum,
  config: z.record(z.string(), z.unknown()).default({}),
});

export type Trigger = z.infer<typeof triggerSchema>;

export const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

export type Condition = z.infer<typeof conditionSchema>;

export const actionSchema = z.object({
  type: actionTypeEnum,
  config: z.record(z.string(), z.unknown()).default({}),
});

export type Action = z.infer<typeof actionSchema>;

export const createAutomationRuleInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  trigger: triggerSchema,
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1),
  projectId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateAutomationRuleInput = z.infer<
  typeof createAutomationRuleInput
>;

export const updateAutomationRuleInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  projectId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAutomationRuleInput = z.infer<
  typeof updateAutomationRuleInput
>;

export const listAutomationRulesInput = z.object({
  projectId: z.string().optional(),
  isActive: z.boolean().optional(),
  triggerType: triggerTypeEnum.optional(),
});

export type ListAutomationRulesInput = z.infer<
  typeof listAutomationRulesInput
>;

export const executeRuleInput = z.object({
  ruleId: z.string().min(1),
  issueId: z.string().min(1),
});

export type ExecuteRuleInput = z.infer<typeof executeRuleInput>;

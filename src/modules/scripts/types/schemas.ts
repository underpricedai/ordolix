import { z } from "zod";

export const triggerTypeEnum = z.enum([
  "manual",
  "scheduled",
  "issue_created",
  "issue_updated",
  "transition",
  "post_function",
]);

export const createScriptInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: triggerTypeEnum,
  code: z.string().min(1),
  isEnabled: z.boolean().default(true),
});

export const updateScriptInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  triggerType: triggerTypeEnum.optional(),
  code: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
});

export const listScriptsInput = z.object({
  triggerType: triggerTypeEnum.optional(),
  isEnabled: z.boolean().optional(),
});

export const executeScriptInput = z.object({
  scriptId: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
});

export const listExecutionsInput = z.object({
  scriptId: z.string().min(1),
  status: z.enum(["success", "error"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type CreateScriptInput = z.infer<typeof createScriptInput>;
export type UpdateScriptInput = z.infer<typeof updateScriptInput>;
export type ListScriptsInput = z.infer<typeof listScriptsInput>;
export type ExecuteScriptInput = z.infer<typeof executeScriptInput>;
export type ListExecutionsInput = z.infer<typeof listExecutionsInput>;

import { z } from "zod";

export const transitionIssueInput = z.object({
  issueId: z.string().min(1),
  transitionId: z.string().min(1),
});

export type TransitionIssueInput = z.infer<typeof transitionIssueInput>;

export const getAvailableTransitionsInput = z.object({
  issueId: z.string().min(1),
});

export type GetAvailableTransitionsInput = z.infer<typeof getAvailableTransitionsInput>;

export const getWorkflowForProjectInput = z.object({
  projectId: z.string().min(1),
});

export type GetWorkflowForProjectInput = z.infer<typeof getWorkflowForProjectInput>;

export const validatorConfig = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type ValidatorConfig = z.infer<typeof validatorConfig>;

import { z } from "zod";

export const createSprintInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  goal: z.string().max(1000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintInput>;

export const updateSprintInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  goal: z.string().max(1000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z
    .enum(["planning", "active", "completed", "cancelled"])
    .optional(),
});

export type UpdateSprintInput = z.infer<typeof updateSprintInput>;

export const listSprintsInput = z.object({
  projectId: z.string().min(1),
  status: z
    .enum(["planning", "active", "completed", "cancelled"])
    .optional(),
});

export type ListSprintsInput = z.infer<typeof listSprintsInput>;

export const startSprintInput = z.object({
  id: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date(),
});

export type StartSprintInput = z.infer<typeof startSprintInput>;

export const completeSprintInput = z.object({
  id: z.string().min(1),
  moveToSprintId: z.string().min(1).optional(),
});

export type CompleteSprintInput = z.infer<typeof completeSprintInput>;

export const addIssuesToSprintInput = z.object({
  sprintId: z.string().min(1),
  issueIds: z.array(z.string().min(1)).min(1),
});

export type AddIssuesToSprintInput = z.infer<typeof addIssuesToSprintInput>;

export const removeIssuesFromSprintInput = z.object({
  sprintId: z.string().min(1),
  issueIds: z.array(z.string().min(1)).min(1),
});

export type RemoveIssuesFromSprintInput = z.infer<
  typeof removeIssuesFromSprintInput
>;

export const getSprintBoardInput = z.object({
  sprintId: z.string().min(1),
});

export type GetSprintBoardInput = z.infer<typeof getSprintBoardInput>;

export const getVelocityInput = z.object({
  projectId: z.string().min(1),
  sprintCount: z.number().int().min(1).max(50).default(10),
});

export type GetVelocityInput = z.infer<typeof getVelocityInput>;

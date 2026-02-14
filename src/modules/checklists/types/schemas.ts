import { z } from "zod";

export const createChecklistInput = z.object({
  issueId: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  position: z.number().int().nonnegative().optional(),
});

export type CreateChecklistInput = z.infer<typeof createChecklistInput>;

export const updateChecklistInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  position: z.number().int().nonnegative().optional(),
});

export type UpdateChecklistInput = z.infer<typeof updateChecklistInput>;

export const addChecklistItemInput = z.object({
  checklistId: z.string().min(1),
  text: z.string().min(1).max(1000),
  assigneeId: z.string().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type AddChecklistItemInput = z.infer<typeof addChecklistItemInput>;

export const updateChecklistItemInput = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000).optional(),
  isChecked: z.boolean().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemInput>;

export const getChecklistsInput = z.object({
  issueId: z.string().min(1),
});

export type GetChecklistsInput = z.infer<typeof getChecklistsInput>;

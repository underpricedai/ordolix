import { z } from "zod";

export const createRetroInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  sprintId: z.string().min(1).optional(),
  categories: z
    .array(z.string().min(1))
    .min(1)
    .default(["Went Well", "To Improve", "Action Items"]),
});

export type CreateRetroInput = z.infer<typeof createRetroInput>;

export const updateRetroInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["active", "completed"]).optional(),
});

export type UpdateRetroInput = z.infer<typeof updateRetroInput>;

export const listRetrosInput = z.object({
  projectId: z.string().min(1),
  status: z.enum(["active", "completed"]).optional(),
});

export type ListRetrosInput = z.infer<typeof listRetrosInput>;

export const addCardInput = z.object({
  retrospectiveId: z.string().min(1),
  category: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export type AddCardInput = z.infer<typeof addCardInput>;

export const updateCardInput = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(2000).optional(),
  category: z.string().min(1).optional(),
  linkedIssueId: z.string().min(1).optional(),
});

export type UpdateCardInput = z.infer<typeof updateCardInput>;

export const voteCardInput = z.object({
  id: z.string().min(1),
});

export type VoteCardInput = z.infer<typeof voteCardInput>;

export const deleteCardInput = z.object({
  id: z.string().min(1),
});

export type DeleteCardInput = z.infer<typeof deleteCardInput>;

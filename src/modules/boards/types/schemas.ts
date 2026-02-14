import { z } from "zod";

export const boardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  statusIds: z.array(z.string().min(1)).min(1),
  minLimit: z.number().int().nonnegative().optional(),
  maxLimit: z.number().int().positive().optional(),
});

export type BoardColumn = z.infer<typeof boardColumnSchema>;

export const createBoardInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  boardType: z.enum(["kanban", "scrum"]).default("kanban"),
  columns: z.array(boardColumnSchema).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardInput>;

export const updateBoardInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  columns: z.array(boardColumnSchema).optional(),
  swimlanes: z.array(z.record(z.string(), z.unknown())).optional(),
  cardFields: z.array(z.string()).optional(),
  cardColor: z.string().optional(),
  quickFilters: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type UpdateBoardInput = z.infer<typeof updateBoardInput>;

export const getBoardDataInput = z.object({
  id: z.string().min(1),
  sprintId: z.string().optional(),
  assigneeId: z.string().optional(),
  issueTypeId: z.string().optional(),
});

export type GetBoardDataInput = z.infer<typeof getBoardDataInput>;

import { z } from "zod";

export const groupByEnum = z.enum([
  "epic",
  "assignee",
  "priority",
  "status",
  "issueType",
  "sprint",
]);

export type GroupBy = z.infer<typeof groupByEnum>;

export const saveViewInput = z.object({
  name: z.string().min(1).max(255),
  projectId: z.string().min(1).optional(),
  groupBy: groupByEnum.optional(),
  columns: z.array(z.record(z.string(), z.unknown())).optional(),
  sortBy: z.string().min(1).optional(),
  filterQuery: z.string().optional(),
  isShared: z.boolean().optional(),
});

export type SaveViewInput = z.infer<typeof saveViewInput>;

export const getViewInput = z.object({
  id: z.string().min(1),
});

export type GetViewInput = z.infer<typeof getViewInput>;

export const listViewsInput = z.object({
  projectId: z.string().min(1).optional(),
});

export type ListViewsInput = z.infer<typeof listViewsInput>;

export const updateViewInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  groupBy: groupByEnum.optional(),
  columns: z.array(z.record(z.string(), z.unknown())).optional(),
  sortBy: z.string().min(1).optional(),
  filterQuery: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
});

export type UpdateViewInput = z.infer<typeof updateViewInput>;

export const deleteViewInput = z.object({
  id: z.string().min(1),
});

export type DeleteViewInput = z.infer<typeof deleteViewInput>;

export const getTreeInput = z.object({
  projectId: z.string().min(1).optional(),
  groupBy: groupByEnum.default("epic"),
});

export type GetTreeInput = z.infer<typeof getTreeInput>;

export const reorderIssueInput = z.object({
  issueId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  afterId: z.string().min(1).nullable(),
});

export type ReorderIssueInput = z.infer<typeof reorderIssueInput>;

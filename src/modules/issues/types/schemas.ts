import { z } from "zod";

export const createIssueInput = z.object({
  projectId: z.string().min(1),
  summary: z.string().min(1).max(255),
  issueTypeId: z.string().min(1),
  description: z.string().optional(),
  priorityId: z.string().optional(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(),
  sprintId: z.string().optional(),
  labels: z.array(z.string()).default([]),
  storyPoints: z.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).default({}),
});

export type CreateIssueInput = z.infer<typeof createIssueInput>;

export const updateIssueInput = z.object({
  id: z.string().min(1),
  summary: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  issueTypeId: z.string().optional(),
  priorityId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  storyPoints: z.number().positive().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueInput>;

export const listIssuesInput = z.object({
  projectId: z.string().min(1),
  statusId: z.string().optional(),
  assigneeId: z.string().optional(),
  issueTypeId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z
    .enum(["createdAt", "updatedAt", "priority", "rank"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListIssuesInput = z.infer<typeof listIssuesInput>;

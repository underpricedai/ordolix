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

// ── History ────────────────────────────────────────────────────────────────

export const listHistoryInput = z.object({
  issueId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type ListHistoryInput = z.infer<typeof listHistoryInput>;

// ── Watchers ───────────────────────────────────────────────────────────────

export const watcherInput = z.object({
  issueId: z.string().min(1),
});

export const addWatcherInput = z.object({
  issueId: z.string().min(1),
  userId: z.string().min(1),
});

// ── Voting ─────────────────────────────────────────────────────────────────

export const voteInput = z.object({
  issueId: z.string().min(1),
});

// ── Comments ───────────────────────────────────────────────────────────────

export const listCommentsInput = z.object({
  issueId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type ListCommentsInput = z.infer<typeof listCommentsInput>;

export const createCommentInput = z.object({
  issueId: z.string().min(1),
  body: z.string().min(1).max(50000),
  isInternal: z.boolean().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentInput>;

export const updateCommentInput = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(50000),
});

export type UpdateCommentInput = z.infer<typeof updateCommentInput>;

export const deleteCommentInput = z.object({
  id: z.string().min(1),
});

// ── Subtasks ───────────────────────────────────────────────────────────────

export const getChildrenInput = z.object({
  issueId: z.string().min(1),
});

// ── Issue Linking ──────────────────────────────────────────────────────────

export const createLinkInput = z.object({
  linkType: z.string().min(1),
  fromIssueId: z.string().min(1),
  toIssueId: z.string().min(1),
});

export type CreateLinkInput = z.infer<typeof createLinkInput>;

export const deleteLinkInput = z.object({
  id: z.string().min(1),
});

export const getLinksInput = z.object({
  issueId: z.string().min(1),
});

// ── Attachments ────────────────────────────────────────────────────────────

export const listAttachmentsInput = z.object({
  issueId: z.string().min(1),
});

export const addAttachmentInput = z.object({
  issueId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(0),
});

export type AddAttachmentInput = z.infer<typeof addAttachmentInput>;

export const deleteAttachmentInput = z.object({
  id: z.string().min(1),
});

// ── Bulk Operations ───────────────────────────────────────────────────────

export const bulkUpdateInput = z.object({
  issueIds: z.array(z.string()).min(1).max(100),
  updates: z.object({
    statusId: z.string().optional(),
    priorityId: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    sprintId: z.string().nullable().optional(),
    labels: z.array(z.string()).optional(),
  }),
});

export type BulkUpdateInput = z.infer<typeof bulkUpdateInput>;

export const bulkDeleteInput = z.object({
  issueIds: z.array(z.string()).min(1).max(100),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteInput>;

export const bulkMoveToSprintInput = z.object({
  issueIds: z.array(z.string()).min(1).max(100),
  sprintId: z.string().nullable(),
});

export type BulkMoveToSprintInput = z.infer<typeof bulkMoveToSprintInput>;

export const cloneIssueInput = z.object({
  issueId: z.string(),
  includeSummaryPrefix: z.boolean().default(true),
  includeSubtasks: z.boolean().default(false),
});

export type CloneIssueInput = z.infer<typeof cloneIssueInput>;

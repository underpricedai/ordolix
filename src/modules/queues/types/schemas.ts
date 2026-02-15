/**
 * @description Zod schemas for the Queue (Service Desk) module.
 * Defines input validation for queue CRUD, issue listing, and assignment.
 */
import { z } from "zod";

/** Sort order options for queue issues. */
export const queueSortOrder = z.enum([
  "created_asc",
  "created_desc",
  "priority_desc",
  "updated_desc",
  "sla_breach_asc",
]);

export type QueueSortOrder = z.infer<typeof queueSortOrder>;

/** Filter criteria stored as JSON on the Queue record. */
export const queueFilterSchema = z.object({
  issueTypeIds: z.array(z.string().min(1)).optional(),
  priorityIds: z.array(z.string().min(1)).optional(),
  statusIds: z.array(z.string().min(1)).optional(),
  assigneeIds: z.array(z.string().min(1)).optional(),
  labels: z.array(z.string().min(1)).optional(),
});

export type QueueFilter = z.infer<typeof queueFilterSchema>;

/** Input for creating a new queue. */
export const createQueueInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  filter: queueFilterSchema,
});

export type CreateQueueInput = z.infer<typeof createQueueInput>;

/** Input for updating an existing queue. */
export const updateQueueInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  filter: queueFilterSchema.optional(),
  sortOrder: queueSortOrder.optional(),
  columns: z.array(z.string().min(1)).optional(),
});

export type UpdateQueueInput = z.infer<typeof updateQueueInput>;

/** Input for listing queues by project. */
export const listQueuesInput = z.object({
  projectId: z.string().min(1),
});

export type ListQueuesInput = z.infer<typeof listQueuesInput>;

/** Input for retrieving paginated issues from a queue. */
export const getQueueIssuesInput = z.object({
  queueId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetQueueIssuesInput = z.infer<typeof getQueueIssuesInput>;

/** Input for assigning an issue from a queue to an agent. */
export const assignFromQueueInput = z.object({
  issueId: z.string().min(1),
  assigneeId: z.string().min(1),
});

export type AssignFromQueueInput = z.infer<typeof assignFromQueueInput>;

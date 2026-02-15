/**
 * Zod schemas for the admin module.
 *
 * @description Defines input validation schemas for admin dashboard stats,
 * audit log queries, webhook CRUD operations, and system health checks.
 *
 * @module admin-schemas
 */
import { z } from "zod";

/**
 * Input schema for fetching admin dashboard statistics.
 * No parameters required -- stats are scoped to the caller's organization.
 */
export const getDashboardStatsInput = z.object({});

export type GetDashboardStatsInput = z.infer<typeof getDashboardStatsInput>;

/**
 * Input schema for listing audit log entries with cursor pagination and filters.
 */
export const listAuditLogInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ListAuditLogInput = z.infer<typeof listAuditLogInput>;

/**
 * Input schema for listing webhook endpoints with cursor pagination.
 */
export const listWebhooksInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type ListWebhooksInput = z.infer<typeof listWebhooksInput>;

/**
 * Input schema for creating a new webhook endpoint.
 */
export const createWebhookInput = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateWebhookInput = z.infer<typeof createWebhookInput>;

/**
 * Input schema for updating an existing webhook endpoint.
 */
export const updateWebhookInput = z.object({
  id: z.string().min(1),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookInput = z.infer<typeof updateWebhookInput>;

/**
 * Input schema for deleting a webhook endpoint.
 */
export const deleteWebhookInput = z.object({
  id: z.string().min(1),
});

export type DeleteWebhookInput = z.infer<typeof deleteWebhookInput>;

/**
 * Input schema for fetching system health status.
 * No parameters required -- health is scoped to the caller's organization.
 */
export const systemHealthInput = z.object({});

export type SystemHealthInput = z.infer<typeof systemHealthInput>;

// ── Priority Schemas ─────────────────────────────────────────────────────────

export const createPriorityInput = z.object({
  name: z.string().min(1).max(100),
  rank: z.number().int().positive(),
  color: z.string().min(1),
  slaMultiplier: z.number().positive().optional(),
});

export type CreatePriorityInput = z.infer<typeof createPriorityInput>;

export const updatePriorityInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  slaMultiplier: z.number().positive().optional(),
});

export type UpdatePriorityInput = z.infer<typeof updatePriorityInput>;

export const deletePriorityInput = z.object({ id: z.string().min(1) });

export type DeletePriorityInput = z.infer<typeof deletePriorityInput>;

export const reorderPrioritiesInput = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export type ReorderPrioritiesInput = z.infer<typeof reorderPrioritiesInput>;

// ── Issue Type Schemas ───────────────────────────────────────────────────────

export const createIssueTypeInput = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1),
  color: z.string().min(1),
  isSubtask: z.boolean().optional(),
  hierarchyLevel: z.number().int().optional(),
  category: z.string().optional(),
});

export type CreateIssueTypeInput = z.infer<typeof createIssueTypeInput>;

export const updateIssueTypeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isSubtask: z.boolean().optional(),
  hierarchyLevel: z.number().int().optional(),
  category: z.string().optional(),
});

export type UpdateIssueTypeInput = z.infer<typeof updateIssueTypeInput>;

export const deleteIssueTypeInput = z.object({ id: z.string().min(1) });

export type DeleteIssueTypeInput = z.infer<typeof deleteIssueTypeInput>;

// ── Issue Type Scheme Schemas ──────────────────────────────────────────────

export const createIssueTypeSchemeInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export type CreateIssueTypeSchemeInput = z.infer<typeof createIssueTypeSchemeInput>;

export const updateIssueTypeSchemeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type UpdateIssueTypeSchemeInput = z.infer<typeof updateIssueTypeSchemeInput>;

export const addIssueTypeSchemeEntryInput = z.object({
  issueTypeSchemeId: z.string().min(1),
  issueTypeId: z.string().min(1),
  isDefault: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type AddIssueTypeSchemeEntryInput = z.infer<typeof addIssueTypeSchemeEntryInput>;

export const removeIssueTypeSchemeEntryInput = z.object({
  id: z.string().min(1),
});

export type RemoveIssueTypeSchemeEntryInput = z.infer<typeof removeIssueTypeSchemeEntryInput>;

export const assignIssueTypeSchemeInput = z.object({
  schemeId: z.string().min(1),
  projectId: z.string().min(1),
});

export type AssignIssueTypeSchemeInput = z.infer<typeof assignIssueTypeSchemeInput>;

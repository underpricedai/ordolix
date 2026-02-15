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

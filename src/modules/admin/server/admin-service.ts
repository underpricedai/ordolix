/**
 * Admin service layer.
 *
 * @description Provides business logic for admin dashboard statistics,
 * audit log queries, webhook CRUD operations, and system health checks.
 * All functions are scoped to a single organization via organizationId.
 *
 * @module admin-service
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  ListAuditLogInput,
  ListWebhooksInput,
  CreateWebhookInput,
  UpdateWebhookInput,
} from "../types/schemas";

/**
 * Fetches aggregate statistics for the admin dashboard.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @returns Object with userCount, projectCount, issueCount, workflowCount
 */
export async function getDashboardStats(
  db: PrismaClient,
  organizationId: string,
) {
  const [userCount, projectCount, issueCount, workflowCount] =
    await Promise.all([
      db.organizationMember.count({
        where: { organizationId },
      }),
      db.project.count({
        where: { organizationId, isArchived: false },
      }),
      db.issue.count({
        where: { organizationId },
      }),
      db.workflow.count({
        where: { organizationId, isActive: true },
      }),
    ]);

  return { userCount, projectCount, issueCount, workflowCount };
}

/**
 * Lists audit log entries for an organization with cursor pagination and filters.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @param input - Pagination and filter parameters
 * @returns Object with items array and nextCursor
 */
export async function listAuditLog(
  db: PrismaClient,
  organizationId: string,
  input: ListAuditLogInput,
) {
  const where: Prisma.AuditLogWhereInput = {
    organizationId,
  };

  if (input.action) where.action = input.action;
  if (input.userId) where.userId = input.userId;
  if (input.entityType) where.entityType = input.entityType;
  if (input.startDate || input.endDate) {
    where.createdAt = {};
    if (input.startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = input.startDate;
    }
    if (input.endDate) {
      (where.createdAt as Prisma.DateTimeFilter).lte = input.endDate;
    }
  }

  const items = await db.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return { items, nextCursor };
}

/**
 * Lists webhook endpoints for an organization with cursor pagination.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @param input - Pagination parameters
 * @returns Object with items array and nextCursor
 */
export async function listWebhooks(
  db: PrismaClient,
  organizationId: string,
  input: ListWebhooksInput,
) {
  const items = await db.webhookEndpoint.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return { items, nextCursor };
}

/**
 * Creates a new webhook endpoint for an organization.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the webhook to
 * @param userId - ID of the user creating the webhook
 * @param input - Webhook creation parameters
 * @returns The created webhook endpoint
 */
export async function createWebhook(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateWebhookInput,
) {
  const webhook = await db.webhookEndpoint.create({
    data: {
      organizationId,
      url: input.url,
      events: input.events,
      secretHash: input.secret ?? null,
      isActive: input.isActive,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "WebhookEndpoint",
      entityId: webhook.id,
      action: "CREATED",
      diff: { url: input.url, events: input.events },
    },
  });

  return webhook;
}

/**
 * Updates an existing webhook endpoint.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @param input - Webhook update parameters including the webhook id
 * @returns The updated webhook endpoint
 * @throws NotFoundError if the webhook does not exist in the organization
 */
export async function updateWebhook(
  db: PrismaClient,
  organizationId: string,
  input: UpdateWebhookInput,
) {
  const existing = await db.webhookEndpoint.findFirst({
    where: { id: input.id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("WebhookEndpoint", input.id);
  }

  const { id, ...updates } = input;

  const data: Prisma.WebhookEndpointUpdateInput = {};
  if (updates.url !== undefined) data.url = updates.url;
  if (updates.events !== undefined) data.events = updates.events;
  if (updates.secret !== undefined) data.secretHash = updates.secret;
  if (updates.isActive !== undefined) data.isActive = updates.isActive;

  return db.webhookEndpoint.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a webhook endpoint.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @param webhookId - ID of the webhook to delete
 * @throws NotFoundError if the webhook does not exist in the organization
 */
export async function deleteWebhook(
  db: PrismaClient,
  organizationId: string,
  webhookId: string,
) {
  const existing = await db.webhookEndpoint.findFirst({
    where: { id: webhookId, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("WebhookEndpoint", webhookId);
  }

  await db.webhookEndpoint.delete({
    where: { id: webhookId },
  });
}

/**
 * Returns the current system health status.
 *
 * @param _db - Prisma client instance (unused in placeholder)
 * @param _organizationId - Organization ID (unused in placeholder)
 * @returns Object with health status for database, cache, and queue subsystems
 *
 * @remarks This is a placeholder implementation. Real health checks
 * (database ping, Redis ping, queue status) will be added later.
 */
export async function getSystemHealth(
  _db: PrismaClient,
  _organizationId: string,
) {
  return {
    database: "healthy" as const,
    cache: "healthy" as const,
    queue: "healthy" as const,
    timestamp: new Date(),
  };
}

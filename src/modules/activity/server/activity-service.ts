/**
 * Activity feed service layer.
 *
 * @description Provides business logic for querying audit log entries
 * scoped to an organization. Unlike the admin-only audit log, this
 * service exposes a read-only feed accessible to any authenticated user.
 *
 * @module activity-service
 */
import type { Prisma, PrismaClient } from "@prisma/client";

export interface ListActivityInput {
  entityType?: string;
  limit: number;
  cursor?: string;
}

/**
 * Lists recent audit log entries for the activity feed.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization to scope the query to
 * @param input - Pagination and optional entity type filter
 * @returns Object with items array and nextCursor for pagination
 */
export async function listActivity(
  db: PrismaClient,
  organizationId: string,
  input: ListActivityInput,
) {
  const where: Prisma.AuditLogWhereInput = {
    organizationId,
    ...(input.entityType ? { entityType: input.entityType } : {}),
  };

  const entries = await db.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > input.limit;
  const items = hasMore ? entries.slice(0, -1) : entries;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  };
}

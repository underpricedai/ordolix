/**
 * Favorite service — business logic for bookmarking/favoriting entities.
 *
 * @description Provides toggle, list, and check operations for user favorites
 * across entity types (issues, projects, boards, dashboards).
 */
import type { PrismaClient } from "@prisma/client";

/**
 * Toggles a favorite for the given user and entity. If the favorite exists,
 * it is removed; otherwise it is created.
 *
 * @param db - Prisma client instance
 * @param organizationId - Current organization scope
 * @param userId - The user toggling the favorite
 * @param entityType - Type of entity ("issue", "project", "board", "dashboard")
 * @param entityId - ID of the entity being favorited
 * @returns Object indicating whether the entity is now favorited
 */
export async function toggleFavorite(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  entityType: string,
  entityId: string,
): Promise<{ favorited: boolean }> {
  const existing = await db.favorite.findUnique({
    where: { userId_entityType_entityId: { userId, entityType, entityId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }

  await db.favorite.create({
    data: { organizationId, userId, entityType, entityId },
  });
  return { favorited: true };
}

/**
 * Lists all favorites for a user within an organization, optionally filtered
 * by entity type.
 *
 * @param db - Prisma client instance
 * @param organizationId - Current organization scope
 * @param userId - The user whose favorites to list
 * @param entityType - Optional entity type filter
 * @returns Array of favorite records ordered by most recent first
 */
export async function listFavorites(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  entityType?: string,
) {
  return db.favorite.findMany({
    where: {
      organizationId,
      userId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Checks whether a specific entity is favorited by a user.
 *
 * @param db - Prisma client instance
 * @param userId - The user to check
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns True if the entity is favorited
 */
export async function isFavorited(
  db: PrismaClient,
  userId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  const count = await db.favorite.count({
    where: { userId, entityType, entityId },
  });
  return count > 0;
}

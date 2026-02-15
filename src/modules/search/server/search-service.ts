/**
 * Search service — business logic for AQL search, quick search, suggestions,
 * and saved filter CRUD.
 *
 * @description Handles both structured AQL queries and plain-text fallback
 * search. AQL queries are parsed into an AST and converted to Prisma where
 * clauses via the shared AQL module. Plain-text searches use case-insensitive
 * ILIKE matching on issue summary and description.
 *
 * @module search-service
 */

import type { PrismaClient } from "@prisma/client";
import { parseAQL } from "@/shared/aql";
import { NotFoundError, PermissionError } from "@/server/lib/errors";
import type {
  SearchInput,
  SavedFilterInput,
  UpdateSavedFilterInput,
  ListSavedFiltersInput,
  QuickSearchInput,
  SearchSuggestInput,
} from "../types/schemas";

/** Fields included with every issue result. */
const ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
  reporter: true,
  project: { select: { id: true, key: true, name: true } },
} as const;

/**
 * Execute an AQL or plain-text search against issues.
 *
 * @description Attempts to parse the query as AQL first. When AQL parsing
 * succeeds the generated Prisma where clause is used directly. When parsing
 * fails (syntax error) the query is treated as plain text and matched against
 * issue summary and description using case-insensitive contains.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param userId - Current user id (for currentUser() resolution)
 * @param input - Search input with query, cursor, and limit
 * @returns Paginated search results with nextCursor and total count
 */
export async function search(
  db: PrismaClient,
  organizationId: string,
  _userId: string,
  input: SearchInput,
) {
  let where: Record<string, unknown> = { organizationId, deletedAt: null };
  let orderBy: Record<string, unknown>[] | undefined;

  try {
    const result = parseAQL(input.query);
    where = { ...where, ...result.where };
    orderBy = result.orderBy;
  } catch {
    // AQL parse failed — fall back to plain text search
    where = {
      ...where,
      OR: [
        { summary: { contains: input.query, mode: "insensitive" } },
        { description: { contains: input.query, mode: "insensitive" } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    db.issue.findMany({
      where,
      include: ISSUE_INCLUDE,
      orderBy: orderBy ?? [{ createdAt: "desc" }],
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.issue.count({ where }),
  ]);

  const nextCursor =
    items.length === input.limit ? items[items.length - 1]?.id : undefined;

  return { items, nextCursor, total };
}

/**
 * Quick search for the command palette / header omnibar.
 *
 * @description Searches issues by summary or key, and projects by name or key.
 * Returns both result sets up to the specified limit each.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param input - Quick search input with term and limit
 * @returns Matching issues and projects
 */
export async function quickSearch(
  db: PrismaClient,
  organizationId: string,
  input: QuickSearchInput,
) {
  const [issues, projects] = await Promise.all([
    db.issue.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { summary: { contains: input.term, mode: "insensitive" } },
          { key: { contains: input.term, mode: "insensitive" } },
        ],
      },
      include: ISSUE_INCLUDE,
      take: input.limit,
      orderBy: { updatedAt: "desc" },
    }),
    db.project.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: input.term, mode: "insensitive" } },
          { key: { contains: input.term, mode: "insensitive" } },
        ],
      },
      take: input.limit,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { issues, projects };
}

/**
 * Return autocomplete suggestions based on partial text and optional field context.
 *
 * @description When a specific field context is provided, only matching values
 * for that field are returned. Without a field context, a mix of all field
 * types is returned to support a general autocomplete experience.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param input - Suggest input with partial text and optional field
 * @returns Categorized suggestion arrays
 */
export async function suggest(
  db: PrismaClient,
  organizationId: string,
  input: SearchSuggestInput,
) {
  const limit = 10;
  const containsFilter = { contains: input.partial, mode: "insensitive" as const };

  if (input.field === "status") {
    const statuses = await db.status.findMany({
      where: { organizationId, name: containsFilter },
      take: limit,
    });
    return { statuses, users: [], priorities: [], projects: [] };
  }

  if (input.field === "assignee") {
    const users = await db.user.findMany({
      where: {
        organizationMembers: { some: { organizationId } },
        OR: [
          { name: containsFilter },
          { email: containsFilter },
        ],
      },
      take: limit,
    });
    return { statuses: [], users, priorities: [], projects: [] };
  }

  if (input.field === "priority") {
    const priorities = await db.priority.findMany({
      where: { organizationId, name: containsFilter },
      take: limit,
    });
    return { statuses: [], users: [], priorities, projects: [] };
  }

  if (input.field === "project") {
    const projects = await db.project.findMany({
      where: {
        organizationId,
        OR: [
          { name: containsFilter },
          { key: containsFilter },
        ],
      },
      take: limit,
    });
    return { statuses: [], users: [], priorities: [], projects };
  }

  // No specific field — return a mix of all
  const [statuses, users, priorities, projects] = await Promise.all([
    db.status.findMany({
      where: { organizationId, name: containsFilter },
      take: 5,
    }),
    db.user.findMany({
      where: {
        organizationMembers: { some: { organizationId } },
        OR: [
          { name: containsFilter },
          { email: containsFilter },
        ],
      },
      take: 5,
    }),
    db.priority.findMany({
      where: { organizationId, name: containsFilter },
      take: 5,
    }),
    db.project.findMany({
      where: {
        organizationId,
        OR: [
          { name: containsFilter },
          { key: containsFilter },
        ],
      },
      take: 5,
    }),
  ]);

  return { statuses, users, priorities, projects };
}

/**
 * Save a new filter (persisted as a Prisma Filter record).
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param userId - Owner of the filter
 * @param input - Filter name, AQL query, and sharing flag
 * @returns The created filter record
 */
export async function saveFilter(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: SavedFilterInput,
) {
  return db.filter.create({
    data: {
      organizationId,
      ownerId: userId,
      name: input.name,
      aql: input.query,
      sharedWith: input.isShared ? ["organization"] : [],
    },
  });
}

/**
 * Update an existing saved filter.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param userId - Current user id (must be filter owner)
 * @param input - Partial update fields including filter id
 * @returns The updated filter record
 * @throws NotFoundError if filter does not exist in org
 * @throws PermissionError if user is not the filter owner
 */
export async function updateFilter(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: UpdateSavedFilterInput,
) {
  const existing = await db.filter.findFirst({
    where: { id: input.id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("Filter", input.id);
  }

  if (existing.ownerId !== userId) {
    throw new PermissionError("You can only update your own filters");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.query !== undefined) data.aql = input.query;
  if (input.isShared !== undefined) {
    data.sharedWith = input.isShared ? ["organization"] : [];
  }

  return db.filter.update({
    where: { id: input.id },
    data,
  });
}

/**
 * List saved filters for the current user and optionally shared filters.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param userId - Current user id
 * @param input - Options including whether to include shared filters
 * @returns Array of matching filter records
 */
export async function listFilters(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: ListSavedFiltersInput,
) {
  const where: Record<string, unknown> = { organizationId };

  if (input.includeShared) {
    where.OR = [
      { ownerId: userId },
      { sharedWith: { not: "[]" } },
    ];
  } else {
    where.ownerId = userId;
  }

  return db.filter.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Delete a saved filter.
 *
 * @param db - Prisma client instance
 * @param organizationId - Tenant isolation id
 * @param userId - Current user id (must be filter owner)
 * @param filterId - Id of the filter to delete
 * @throws NotFoundError if filter does not exist in org
 * @throws PermissionError if user is not the filter owner
 */
export async function deleteFilter(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  filterId: string,
) {
  const existing = await db.filter.findFirst({
    where: { id: filterId, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("Filter", filterId);
  }

  if (existing.ownerId !== userId) {
    throw new PermissionError("You can only delete your own filters");
  }

  await db.filter.delete({ where: { id: filterId } });
}

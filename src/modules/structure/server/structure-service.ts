import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/**
 * Creates a new structure view.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param userId - ID of the user creating the view
 * @param input - View configuration
 * @returns The created StructureView record
 */
export async function saveView(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: {
    name: string;
    projectId?: string;
    groupBy?: string;
    columns?: Prisma.InputJsonValue;
    sortBy?: string;
    filterQuery?: string;
    isShared?: boolean;
  },
) {
  return db.structureView.create({
    data: {
      organizationId,
      ownerId: userId,
      name: input.name,
      projectId: input.projectId,
      groupBy: input.groupBy ?? "epic",
      columns: input.columns ?? [],
      sortBy: input.sortBy ?? "rank",
      filterQuery: input.filterQuery,
      isShared: input.isShared ?? false,
    },
  });
}

/**
 * Retrieves a single structure view by ID, scoped to organization.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param id - StructureView ID
 * @returns The matching StructureView record
 * @throws NotFoundError if the view does not exist
 */
export async function getView(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const view = await db.structureView.findFirst({
    where: { id, organizationId },
  });
  if (!view) throw new NotFoundError("StructureView", id);
  return view;
}

/**
 * Lists structure views for an organization, optionally filtered by project.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param projectId - Optional project filter
 * @returns Array of StructureView records ordered by most recently updated
 */
export async function listViews(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
) {
  const where: Prisma.StructureViewWhereInput = { organizationId };
  if (projectId) where.projectId = projectId;
  return db.structureView.findMany({ where, orderBy: { updatedAt: "desc" } });
}

/**
 * Updates an existing structure view.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param id - StructureView ID to update
 * @param updates - Partial view configuration updates
 * @returns The updated StructureView record
 * @throws NotFoundError if the view does not exist
 */
export async function updateView(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: {
    name?: string;
    groupBy?: string;
    columns?: Prisma.InputJsonValue;
    sortBy?: string;
    filterQuery?: string | null;
    isShared?: boolean;
  },
) {
  const existing = await db.structureView.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("StructureView", id);
  return db.structureView.update({ where: { id }, data: updates });
}

/**
 * Deletes a structure view by ID, scoped to organization.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param id - StructureView ID to delete
 * @throws NotFoundError if the view does not exist
 */
export async function deleteView(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.structureView.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("StructureView", id);
  await db.structureView.delete({ where: { id } });
}

/**
 * Builds a hierarchical tree of issues grouped by the specified field
 * with per-group aggregates (count, story points, progress percentage).
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization ID
 * @param input - Tree configuration with optional projectId and groupBy field
 * @returns Object containing grouped issues, aggregates, and total count
 */
export async function getTree(
  db: PrismaClient,
  organizationId: string,
  input: { projectId?: string; groupBy: string },
) {
  const where: Prisma.IssueWhereInput = { organizationId, deletedAt: null };
  if (input.projectId) where.projectId = input.projectId;

  const issues = await db.issue.findMany({
    where,
    include: {
      issueType: true,
      status: true,
      priority: true,
      assignee: { select: { id: true, name: true, image: true } },
      parent: { select: { id: true, key: true, summary: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group issues by the specified field
  const groups: Record<string, typeof issues> = {};
  for (const issue of issues) {
    let groupKey: string;
    switch (input.groupBy) {
      case "assignee":
        groupKey = issue.assignee?.name ?? "Unassigned";
        break;
      case "priority":
        groupKey = issue.priority.name;
        break;
      case "status":
        groupKey = issue.status.name;
        break;
      case "issueType":
        groupKey = issue.issueType.name;
        break;
      case "sprint":
        groupKey = issue.sprintId ?? "No Sprint";
        break;
      default:
        // epic grouping — group by parent
        groupKey = issue.parentId ?? "No Parent";
        break;
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey]!.push(issue);
  }

  // Compute aggregates per group
  const aggregates: Record<
    string,
    { count: number; storyPoints: number; progress: number }
  > = {};
  for (const [key, groupIssues] of Object.entries(groups)) {
    const count = groupIssues.length;
    const storyPoints = groupIssues.reduce(
      (sum, i) => sum + (i.storyPoints ?? 0),
      0,
    );
    const doneCount = groupIssues.filter(
      (i) => i.status.category === "DONE",
    ).length;
    aggregates[key] = {
      count,
      storyPoints,
      progress: count > 0 ? Math.round((doneCount / count) * 100) : 0,
    };
  }

  return { groups, aggregates, totalCount: issues.length };
}

/**
 * Bulk operations service for issues.
 *
 * @description Provides batch update, delete, sprint move, and clone
 * operations for multiple issues. All operations enforce organization
 * isolation and create audit log entries.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/**
 * Updates for bulk issue operations.
 */
export interface BulkUpdateFields {
  statusId?: string;
  priorityId?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  labels?: string[];
}

/**
 * Options for cloning an issue.
 */
export interface CloneIssueOptions {
  /** Whether to prefix cloned summary with "CLONE - ". Defaults to true. */
  includeSummaryPrefix?: boolean;
  /** Whether to clone attachments. Not implemented yet. */
  includeAttachments?: boolean;
  /** Whether to clone subtasks. Not implemented yet. */
  includeSubtasks?: boolean;
}

/**
 * Bulk updates multiple issues with the same field values.
 *
 * @description Finds all requested issues within the organization, applies
 * the update fields, creates history records for changed fields, and logs
 * audit entries. Reports any IDs that were not found as failed.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - User performing the update
 * @param issueIds - Array of issue IDs to update
 * @param updates - Fields to update on all matched issues
 * @returns Count of updated issues and array of failed IDs
 *
 * @example
 * const result = await bulkUpdateIssues(db, orgId, userId, ["i1", "i2"], { statusId: "done" });
 * // result: { updated: 2, failed: [] }
 */
export async function bulkUpdateIssues(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueIds: string[],
  updates: BulkUpdateFields,
): Promise<{ updated: number; failed: string[] }> {
  // Find all issues that exist in this org
  const existingIssues = await db.issue.findMany({
    where: {
      id: { in: issueIds },
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      statusId: true,
      priorityId: true,
      assigneeId: true,
      sprintId: true,
      labels: true,
    },
  });

  const foundIds = new Set(existingIssues.map((i) => i.id));
  const failed = issueIds.filter((id) => !foundIds.has(id));

  if (existingIssues.length === 0) {
    return { updated: 0, failed };
  }

  const result = await db.$transaction(async (tx) => {
    // Build the update data using unchecked input for updateMany
    const data: Record<string, unknown> = {};
    if (updates.statusId !== undefined) data.statusId = updates.statusId;
    if (updates.priorityId !== undefined) data.priorityId = updates.priorityId;
    if (updates.assigneeId !== undefined) data.assigneeId = updates.assigneeId;
    if (updates.sprintId !== undefined) data.sprintId = updates.sprintId;
    if (updates.labels !== undefined) data.labels = updates.labels;

    const updateResult = await tx.issue.updateMany({
      where: {
        id: { in: existingIssues.map((i) => i.id) },
        organizationId,
      },
      data,
    });

    // Create history records for each issue and changed field
    const historyRecords: Array<{
      organizationId: string;
      issueId: string;
      userId: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const trackedFields = ["statusId", "priorityId", "assigneeId", "sprintId"] as const;

    for (const issue of existingIssues) {
      for (const field of trackedFields) {
        if (updates[field] !== undefined) {
          const oldVal = issue[field];
          const newVal = updates[field];
          if (oldVal !== newVal) {
            historyRecords.push({
              organizationId,
              issueId: issue.id,
              userId,
              field,
              oldValue: oldVal != null ? String(oldVal) : null,
              newValue: newVal != null ? String(newVal) : null,
            });
          }
        }
      }

      // Track labels separately
      if (updates.labels !== undefined) {
        const oldLabels = issue.labels as string[];
        if (JSON.stringify(oldLabels) !== JSON.stringify(updates.labels)) {
          historyRecords.push({
            organizationId,
            issueId: issue.id,
            userId,
            field: "labels",
            oldValue: JSON.stringify(oldLabels),
            newValue: JSON.stringify(updates.labels),
          });
        }
      }
    }

    if (historyRecords.length > 0) {
      await tx.issueHistory.createMany({ data: historyRecords });
    }

    // Audit log entries
    const auditEntries = existingIssues.map((issue) => ({
      organizationId,
      userId,
      entityType: "Issue",
      entityId: issue.id,
      action: "BULK_UPDATED",
      diff: updates as unknown as Prisma.InputJsonValue,
    }));

    await tx.auditLog.createMany({ data: auditEntries });

    return { updated: updateResult.count };
  });

  return { ...result, failed };
}

/**
 * Bulk soft-deletes multiple issues.
 *
 * @description Sets deletedAt on all matching issues within the organization.
 * Does not permanently remove data.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param issueIds - Array of issue IDs to delete
 * @returns Count of deleted issues
 *
 * @example
 * const result = await bulkDeleteIssues(db, orgId, ["i1", "i2"]);
 * // result: { deleted: 2 }
 */
export async function bulkDeleteIssues(
  db: PrismaClient,
  organizationId: string,
  issueIds: string[],
): Promise<{ deleted: number }> {
  const result = await db.issue.updateMany({
    where: {
      id: { in: issueIds },
      organizationId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  return { deleted: result.count };
}

/**
 * Moves multiple issues to a sprint (or removes from sprint).
 *
 * @description Updates the sprintId on all matching issues. Pass null
 * to remove issues from their current sprint.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param issueIds - Array of issue IDs to move
 * @param sprintId - Target sprint ID, or null to remove from sprint
 * @returns Count of moved issues
 *
 * @example
 * const result = await bulkMoveToSprint(db, orgId, ["i1", "i2"], "sprint-3");
 * // result: { moved: 2 }
 */
export async function bulkMoveToSprint(
  db: PrismaClient,
  organizationId: string,
  issueIds: string[],
  sprintId: string | null,
): Promise<{ moved: number }> {
  const result = await db.issue.updateMany({
    where: {
      id: { in: issueIds },
      organizationId,
      deletedAt: null,
    },
    data: { sprintId },
  });

  return { moved: result.count };
}

/**
 * Clones an issue, creating a new issue with the same field values.
 *
 * @description Creates a copy of the specified issue with a new key,
 * optionally prefixing the summary with "CLONE - ". The reporter is
 * set to the current user. The clone gets a new auto-incremented key
 * from the project counter.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - User performing the clone
 * @param issueId - Source issue ID to clone
 * @param options - Clone options (prefix, subtasks, attachments)
 * @returns The newly created cloned issue
 * @throws NotFoundError if the source issue is not found
 *
 * @example
 * const clone = await cloneIssue(db, orgId, userId, "issue-1", { includeSummaryPrefix: true });
 */
export async function cloneIssue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueId: string,
  options: CloneIssueOptions = {},
) {
  const { includeSummaryPrefix = true } = options;

  // Find the source issue
  const source = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
  });

  if (!source) {
    throw new NotFoundError("Issue", issueId);
  }

  // Get the project for key generation
  const project = await db.project.findFirst({
    where: { id: source.projectId, organizationId },
  });

  if (!project) {
    throw new NotFoundError("Project", source.projectId);
  }

  return db.$transaction(async (tx) => {
    // Increment project counter
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { issueCounter: { increment: 1 } },
    });

    const key = `${project.key}-${updated.issueCounter}`;
    const summary = includeSummaryPrefix
      ? `CLONE - ${source.summary}`
      : source.summary;

    const clone = await tx.issue.create({
      data: {
        organizationId,
        projectId: source.projectId,
        key,
        summary,
        description: source.description,
        issueTypeId: source.issueTypeId,
        statusId: source.statusId,
        priorityId: source.priorityId,
        reporterId: userId,
        assigneeId: source.assigneeId,
        parentId: source.parentId,
        sprintId: source.sprintId,
        labels: source.labels as string[],
        storyPoints: source.storyPoints,
        dueDate: source.dueDate,
        startDate: source.startDate,
        customFieldValues: source.customFieldValues as Prisma.InputJsonValue,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Issue",
        entityId: clone.id,
        action: "CREATED",
        diff: { clonedFrom: issueId, key, summary },
      },
    });

    return clone;
  });
}

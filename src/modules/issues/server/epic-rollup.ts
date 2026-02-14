/**
 * Epic Sum Up (Story Point Rollup) Service
 *
 * Calculates aggregated metrics from an epic's child issues, including
 * story points, time estimates, and completion progress.
 *
 * @module epic-rollup
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/**
 * Aggregated rollup metrics for an epic's child issues.
 */
export interface EpicRollupResult {
  /** Sum of children's storyPoints (nulls treated as 0) */
  storyPoints: number;
  /** Sum of children's originalEstimate in seconds (nulls treated as 0) */
  originalEstimate: number;
  /** Sum of children's remainingEstimate in seconds (nulls treated as 0) */
  remainingEstimate: number;
  /** Sum of children's timeSpent in seconds (nulls treated as 0) */
  timeSpent: number;
  /** Total number of non-deleted children */
  childCount: number;
  /** Number of children whose status category is DONE */
  doneCount: number;
  /** Completion progress as doneCount / childCount (0-1, 0 if no children) */
  progress: number;
}

/**
 * Calculates aggregated rollup metrics for all non-deleted children of an issue.
 *
 * @description Queries all direct children of the given issue, sums their
 *   story points and time tracking fields, and calculates completion progress
 *   based on how many children have a status with category "DONE".
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization ID for tenant isolation
 * @param issueId - The parent issue ID to aggregate children for
 * @returns Aggregated rollup metrics
 * @throws {NotFoundError} When the parent issue does not exist in the organization
 *
 * @example
 * ```ts
 * const rollup = await getRollup(db, "org-1", "issue-123");
 * console.log(rollup.storyPoints); // 21
 * console.log(rollup.progress);    // 0.66
 * ```
 */
export async function getRollup(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
): Promise<EpicRollupResult> {
  // Verify the parent issue exists in this organization
  const parent = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
  });

  if (!parent) {
    throw new NotFoundError("Issue", issueId);
  }

  // Fetch all non-deleted children with their status for category check
  const children = await db.issue.findMany({
    where: {
      parentId: issueId,
      organizationId,
      deletedAt: null,
    },
    include: {
      status: true,
    },
  });

  const childCount = children.length;

  if (childCount === 0) {
    return {
      storyPoints: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      timeSpent: 0,
      childCount: 0,
      doneCount: 0,
      progress: 0,
    };
  }

  let storyPoints = 0;
  let originalEstimate = 0;
  let remainingEstimate = 0;
  let timeSpent = 0;
  let doneCount = 0;

  for (const child of children) {
    storyPoints += child.storyPoints ?? 0;
    originalEstimate += child.originalEstimate ?? 0;
    remainingEstimate += child.remainingEstimate ?? 0;
    timeSpent += child.timeSpent ?? 0;

    if (child.status.category === "DONE") {
      doneCount++;
    }
  }

  return {
    storyPoints,
    originalEstimate,
    remainingEstimate,
    timeSpent,
    childCount,
    doneCount,
    progress: doneCount / childCount,
  };
}

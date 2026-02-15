/**
 * Auto-assignment strategies for service desk queues.
 *
 * @description Implements round-robin and least-busy assignment strategies
 * for automatically assigning issues from a queue to team members.
 */
import type { PrismaClient } from "@prisma/client";

export type AssignmentStrategy = "round_robin" | "least_busy" | "manual";

export interface AssignmentConfig {
  strategy: AssignmentStrategy;
  members: string[]; // User IDs eligible for assignment
  lastAssigned?: string; // User ID last assigned (for round robin)
}

/**
 * Auto-assign an issue based on the queue's assignment rule.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param config - Assignment configuration
 * @returns The user ID to assign to, or null if manual
 */
export async function resolveAssignee(
  db: PrismaClient,
  organizationId: string,
  config: AssignmentConfig,
): Promise<string | null> {
  if (config.strategy === "manual" || config.members.length === 0) {
    return null;
  }

  if (config.strategy === "round_robin") {
    return roundRobin(config);
  }

  if (config.strategy === "least_busy") {
    return leastBusy(db, organizationId, config.members);
  }

  return null;
}

/**
 * Round-robin assignment: picks the next member after the last assigned.
 */
function roundRobin(config: AssignmentConfig): string {
  const { members, lastAssigned } = config;

  if (!lastAssigned) {
    return members[0]!;
  }

  const lastIndex = members.indexOf(lastAssigned);
  const nextIndex = (lastIndex + 1) % members.length;
  return members[nextIndex]!;
}

/**
 * Least-busy assignment: picks the member with the fewest open issues assigned.
 */
async function leastBusy(
  db: PrismaClient,
  organizationId: string,
  members: string[],
): Promise<string> {
  const counts = await Promise.all(
    members.map(async (userId) => {
      const count = await db.issue.count({
        where: {
          organizationId,
          assigneeId: userId,
          deletedAt: null,
          status: { category: { not: "DONE" } },
        },
      });
      return { userId, count };
    }),
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0]!.userId;
}

/**
 * Capacity planning service — team capacity, user allocations, time-off, and
 * capacity-vs-load calculations.
 * @module capacity-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  SetTeamCapacityInput,
  SetAllocationInput,
  ListAllocationsInput,
  AddTimeOffInput,
  ListTimeOffInput,
  ComputeCapacityInput,
  GetCapacityVsLoadInput,
} from "../types/schemas";

// ── Team Capacity ───────────────────────────────────────────────────────────

/**
 * Retrieve team capacity for a project within a specific period.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param projectId - The project to query
 * @param periodStart - Start of the capacity period
 * @param periodEnd - End of the capacity period
 * @returns The team capacity record, or null if none exists
 */
export async function getTeamCapacity(
  db: PrismaClient,
  organizationId: string,
  projectId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return db.teamCapacity.findUnique({
    where: {
      projectId_periodStart_periodEnd: {
        projectId,
        periodStart,
        periodEnd,
      },
    },
  });
}

/**
 * Create or update team capacity for a project period.
 * Uses upsert to ensure idempotent writes.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Capacity data including project, period, and hours
 * @returns The upserted team capacity record
 */
export async function setTeamCapacity(
  db: PrismaClient,
  organizationId: string,
  input: SetTeamCapacityInput,
) {
  return db.teamCapacity.upsert({
    where: {
      projectId_periodStart_periodEnd: {
        projectId: input.projectId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    },
    create: {
      organizationId,
      projectId: input.projectId,
      sprintId: input.sprintId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalHours: input.totalHours,
      allocatedHours: input.allocatedHours,
    },
    update: {
      totalHours: input.totalHours,
      allocatedHours: input.allocatedHours,
      sprintId: input.sprintId,
    },
  });
}

// ── User Allocations ────────────────────────────────────────────────────────

/**
 * Create a new user allocation record for a project.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Allocation data including user, project, percentage, and dates
 * @returns The created allocation record
 */
export async function setAllocation(
  db: PrismaClient,
  organizationId: string,
  input: SetAllocationInput,
) {
  return db.userAllocation.create({
    data: {
      organizationId,
      userId: input.userId,
      projectId: input.projectId,
      percentage: input.percentage ?? 100,
      hoursPerDay: input.hoursPerDay ?? 8,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
}

/**
 * List allocations filtered by user and/or project.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Optional userId and projectId filters
 * @returns Array of allocation records, ordered by start date descending
 */
export async function listAllocations(
  db: PrismaClient,
  organizationId: string,
  input: ListAllocationsInput,
) {
  const where: Prisma.UserAllocationWhereInput = { organizationId };
  if (input.userId) where.userId = input.userId;
  if (input.projectId) where.projectId = input.projectId;
  return db.userAllocation.findMany({
    where,
    orderBy: { startDate: "desc" },
  });
}

/**
 * Delete an allocation by ID within the tenant.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param id - The allocation ID to delete
 * @throws NotFoundError if the allocation does not exist in this organization
 */
export async function deleteAllocation(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.userAllocation.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("UserAllocation", id);
  await db.userAllocation.delete({ where: { id } });
}

// ── Time Off ────────────────────────────────────────────────────────────────

/**
 * Record a time-off entry for a user.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Time-off data including user, date, hours, and type
 * @returns The created time-off record
 */
export async function addTimeOff(
  db: PrismaClient,
  organizationId: string,
  input: AddTimeOffInput,
) {
  return db.timeOff.create({
    data: {
      organizationId,
      userId: input.userId,
      date: input.date,
      hours: input.hours ?? 8,
      type: input.type ?? "vacation",
      description: input.description,
    },
  });
}

/**
 * List time-off entries with optional filters for user and date range.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Optional userId, startDate, endDate filters
 * @returns Array of time-off records, ordered by date ascending
 */
export async function listTimeOff(
  db: PrismaClient,
  organizationId: string,
  input: ListTimeOffInput,
) {
  const where: Prisma.TimeOffWhereInput = { organizationId };
  if (input.userId) where.userId = input.userId;
  if (input.startDate || input.endDate) {
    where.date = {};
    if (input.startDate)
      (where.date as Prisma.DateTimeFilter).gte = input.startDate;
    if (input.endDate)
      (where.date as Prisma.DateTimeFilter).lte = input.endDate;
  }
  return db.timeOff.findMany({ where, orderBy: { date: "asc" } });
}

/**
 * Remove a time-off entry by ID within the tenant.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param id - The time-off record ID to delete
 * @throws NotFoundError if the time-off record does not exist in this organization
 */
export async function removeTimeOff(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.timeOff.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("TimeOff", id);
  await db.timeOff.delete({ where: { id } });
}

// ── Capacity Computation ────────────────────────────────────────────────────

/**
 * Compute total available capacity for a project within a period.
 * Sums user allocations, subtracts time-off, and excludes weekends.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Project ID and period boundaries
 * @returns Computed capacity summary with total hours, working days, and time-off deductions
 */
export async function computeCapacity(
  db: PrismaClient,
  organizationId: string,
  input: ComputeCapacityInput,
) {
  const allocations = await db.userAllocation.findMany({
    where: {
      organizationId,
      projectId: input.projectId,
      startDate: { lte: input.periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: input.periodStart } }],
    },
  });

  const timeOffs = await db.timeOff.findMany({
    where: {
      organizationId,
      userId: {
        in: allocations.map(
          (a: { userId: string }) => a.userId,
        ),
      },
      date: { gte: input.periodStart, lte: input.periodEnd },
    },
  });

  // Calculate working days in period (excludes weekends)
  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);
  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) workingDays++;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Sum capacity per user, subtracting time-off
  let totalCapacityHours = 0;
  for (const alloc of allocations) {
    const userTimeOff = timeOffs
      .filter(
        (t: { userId: string; hours: number }) =>
          t.userId === alloc.userId,
      )
      .reduce(
        (sum: number, t: { hours: number }) => sum + t.hours,
        0,
      );
    const rawHours =
      workingDays * alloc.hoursPerDay * (alloc.percentage / 100);
    totalCapacityHours += rawHours - userTimeOff;
  }

  return {
    totalCapacityHours,
    workingDays,
    allocations: allocations.length,
    timeOffHours: timeOffs.reduce(
      (s: number, t: { hours: number }) => s + t.hours,
      0,
    ),
  };
}

/**
 * Compare team capacity against planned workload for a project period.
 * Combines computeCapacity with issue aggregate estimates.
 * @param db - Prisma client instance
 * @param organizationId - Tenant ID for row-level isolation
 * @param input - Project ID and period boundaries
 * @returns Capacity, planned hours/points, load percentage, and overallocation flag
 */
export async function getCapacityVsLoad(
  db: PrismaClient,
  organizationId: string,
  input: GetCapacityVsLoadInput,
) {
  const capacity = await computeCapacity(db, organizationId, input);

  // Get planned work (sum of original estimates)
  const result = await db.issue.aggregate({
    where: {
      organizationId,
      projectId: input.projectId,
      deletedAt: null,
    },
    _sum: { originalEstimate: true, storyPoints: true },
  });

  const plannedHours = (result._sum.originalEstimate ?? 0) / 3600; // Convert seconds to hours
  const plannedPoints = result._sum.storyPoints ?? 0;
  const loadPercent =
    capacity.totalCapacityHours > 0
      ? Math.round((plannedHours / capacity.totalCapacityHours) * 100)
      : 0;
  const isOverallocated = loadPercent > 100;

  return {
    ...capacity,
    plannedHours,
    plannedPoints,
    loadPercent,
    isOverallocated,
  };
}

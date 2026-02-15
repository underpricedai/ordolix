import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, PermissionError } from "@/server/lib/errors";
import type {
  CreateReportInput,
  ListReportsInput,
  UpdateReportInput,
} from "../types/schemas";

export async function createReport(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateReportInput,
) {
  return db.savedReport.create({
    data: {
      organizationId,
      createdBy: userId,
      name: input.name,
      reportType: input.reportType,
      query: input.query as unknown as Prisma.InputJsonValue,
      description: input.description,
      visualization: (input.visualization as unknown as Prisma.InputJsonValue) ?? undefined,
      isShared: input.isShared,
      schedule: (input.schedule as unknown as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

export async function getReport(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const report = await db.savedReport.findFirst({
    where: { id, organizationId },
  });
  if (!report) {
    throw new NotFoundError("SavedReport", id);
  }
  return report;
}

export async function listReports(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: ListReportsInput,
) {
  return db.savedReport.findMany({
    where: {
      organizationId,
      ...(input.reportType ? { reportType: input.reportType } : {}),
      ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
      OR: [{ createdBy: userId }, { isShared: true }],
    },
    orderBy: { updatedAt: "desc" as const },
  });
}

export async function updateReport(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
  input: Omit<UpdateReportInput, "id">,
) {
  const report = await db.savedReport.findFirst({
    where: { id, organizationId },
  });
  if (!report) {
    throw new NotFoundError("SavedReport", id);
  }
  if (report.createdBy !== userId && !report.isShared) {
    throw new PermissionError(
      "Only the report creator or shared report collaborators can update",
    );
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.reportType !== undefined) data.reportType = input.reportType;
  if (input.query !== undefined) data.query = input.query as unknown as Prisma.InputJsonValue;
  if (input.visualization !== undefined) data.visualization = input.visualization as unknown as Prisma.InputJsonValue;
  if (input.isShared !== undefined) data.isShared = input.isShared;
  if (input.schedule !== undefined) data.schedule = input.schedule as unknown as Prisma.InputJsonValue;

  return db.savedReport.update({
    where: { id },
    data,
  });
}

export async function deleteReport(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const report = await db.savedReport.findFirst({
    where: { id, organizationId },
  });
  if (!report) {
    throw new NotFoundError("SavedReport", id);
  }
  if (report.createdBy !== userId) {
    throw new PermissionError("Only the report creator can delete this report");
  }

  return db.savedReport.delete({
    where: { id },
  });
}

/**
 * Runs a saved report and returns aggregated data.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param id - Saved report ID
 * @returns Object with reportId, aggregated data array, and generatedAt timestamp
 * @throws NotFoundError if the report does not exist
 */
export async function runReport(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const report = await db.savedReport.findFirst({
    where: { id, organizationId },
  });
  if (!report) {
    throw new NotFoundError("SavedReport", id);
  }

  const query = report.query as Record<string, unknown> | null;
  const projectId = (query?.projectId as string) ?? undefined;

  let data: Record<string, unknown>[];

  switch (report.reportType) {
    case "issue_summary":
      data = await runIssueSummary(db, organizationId, projectId);
      break;
    case "time_tracking":
      data = await runTimeTracking(db, organizationId, projectId);
      break;
    case "velocity":
      data = await runVelocity(db, organizationId, projectId);
      break;
    case "sla_compliance":
      data = await runSlaCompliance(db, organizationId, projectId);
      break;
    default:
      data = [];
  }

  return {
    reportId: report.id,
    data,
    generatedAt: new Date(),
  };
}

async function runIssueSummary(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
): Promise<Record<string, unknown>[]> {
  const where: Prisma.IssueWhereInput = {
    organizationId,
    deletedAt: null,
    ...(projectId ? { projectId } : {}),
  };

  const [total, byStatus, byPriority] = await Promise.all([
    db.issue.count({ where }),
    db.issue.groupBy({
      by: ["statusId"],
      where,
      _count: true,
    }),
    db.issue.groupBy({
      by: ["priorityId"],
      where,
      _count: true,
    }),
  ]);

  return [
    { metric: "total_issues", value: total },
    ...byStatus.map((s) => ({
      metric: "by_status",
      statusId: s.statusId,
      count: s._count,
    })),
    ...byPriority.map((p) => ({
      metric: "by_priority",
      priorityId: p.priorityId,
      count: p._count,
    })),
  ];
}

async function runTimeTracking(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
): Promise<Record<string, unknown>[]> {
  const where: Prisma.TimeLogWhereInput = {
    organizationId,
    ...(projectId ? { issue: { projectId } } : {}),
  };

  const logs = await db.timeLog.groupBy({
    by: ["userId"],
    where,
    _sum: { duration: true },
    _count: true,
  });

  return logs.map((l) => ({
    metric: "time_by_user",
    userId: l.userId,
    totalSeconds: l._sum?.duration ?? 0,
    entryCount: l._count,
  }));
}

async function runVelocity(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
): Promise<Record<string, unknown>[]> {
  const sprints = await db.sprint.findMany({
    where: {
      project: { organizationId },
      status: "completed",
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      issues: {
        include: { status: true },
        where: { deletedAt: null },
      },
    },
  });

  return sprints.map((sprint) => {
    const done = sprint.issues.filter((i) => i.status.category === "DONE");
    return {
      metric: "velocity",
      sprintName: sprint.name,
      completedPoints: done.reduce((s, i) => s + (i.storyPoints ?? 0), 0),
      completedCount: done.length,
      totalCount: sprint.issues.length,
    };
  });
}

async function runSlaCompliance(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
): Promise<Record<string, unknown>[]> {
  const where: Prisma.SLAInstanceWhereInput = {
    organizationId,
    ...(projectId ? { issue: { projectId } } : {}),
  };

  const instances = await db.sLAInstance.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  return instances.map((i) => ({
    metric: "sla_by_status",
    status: i.status,
    count: i._count,
  }));
}

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

  // Stub implementation: actual aggregation is future work
  return {
    reportId: report.id,
    data: [] as Record<string, unknown>[],
    generatedAt: new Date(),
  };
}

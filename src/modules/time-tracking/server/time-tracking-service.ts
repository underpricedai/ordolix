import type { PrismaClient } from "@prisma/client";
import { NotFoundError, PermissionError } from "@/server/lib/errors";
import type { LogTimeInput, ListTimeLogsInput } from "../types/schemas";

export async function logTime(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: LogTimeInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  return db.timeLog.create({
    data: {
      organizationId,
      issueId: input.issueId,
      userId,
      date: input.date,
      duration: input.duration,
      description: input.description,
      billable: input.billable,
    },
  });
}

export async function getTimeLog(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const timeLog = await db.timeLog.findFirst({
    where: { id, organizationId },
  });
  if (!timeLog) {
    throw new NotFoundError("TimeLog", id);
  }
  return timeLog;
}

export async function listTimeLogs(
  db: PrismaClient,
  organizationId: string,
  input: ListTimeLogsInput,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId };
  if (input.issueId) where.issueId = input.issueId;
  if (input.userId) where.userId = input.userId;
  if (input.startDate || input.endDate) {
    where.date = {};
    if (input.startDate) where.date.gte = input.startDate;
    if (input.endDate) where.date.lte = input.endDate;
  }
  if (input.cursor) where.id = { gt: input.cursor };

  const timeLogs = await db.timeLog.findMany({
    where,
    orderBy: { date: "desc" },
    take: input.limit,
  });

  return {
    items: timeLogs,
    nextCursor: timeLogs.length === input.limit ? timeLogs[timeLogs.length - 1]?.id : undefined,
  };
}

export async function updateTimeLog(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
  updates: { date?: Date; duration?: number; description?: string; billable?: boolean },
) {
  const existing = await db.timeLog.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("TimeLog", id);
  }
  if (existing.userId !== userId) {
    throw new PermissionError("You can only update your own time logs");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (updates.date !== undefined) data.date = updates.date;
  if (updates.duration !== undefined) data.duration = updates.duration;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.billable !== undefined) data.billable = updates.billable;

  return db.timeLog.update({ where: { id }, data });
}

export async function deleteTimeLog(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const existing = await db.timeLog.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("TimeLog", id);
  }
  if (existing.userId !== userId) {
    throw new PermissionError("You can only delete your own time logs");
  }

  await db.timeLog.delete({ where: { id } });
}

export async function getIssueTotalTime(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const result = await db.timeLog.aggregate({
    where: { issueId, organizationId },
    _sum: { duration: true },
  });

  return result._sum.duration ?? 0;
}

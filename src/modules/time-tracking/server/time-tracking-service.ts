import type { PrismaClient } from "@prisma/client";
import { NotFoundError, PermissionError, ValidationError } from "@/server/lib/errors";
import type {
  LogTimeInput,
  ListTimeLogsInput,
  GetTimesheetInput,
  ListPendingTimesheetsInput,
  MyLoggedHoursInput,
  TeamLoggedHoursInput,
} from "../types/schemas";

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

// ── Timesheet Approval Workflow ────────────────────────────────────────────

export async function getOrCreateTimesheet(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: GetTimesheetInput,
) {
  const existing = await db.timesheet.findUnique({
    where: { userId_periodStart_periodEnd: { userId, periodStart: input.periodStart, periodEnd: input.periodEnd } },
    include: { timeLogs: true },
  });

  if (existing) return existing;

  return db.timesheet.create({
    data: {
      organizationId,
      userId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: "draft",
    },
    include: { timeLogs: true },
  });
}

export async function submitTimesheet(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const timesheet = await db.timesheet.findFirst({
    where: { id, organizationId },
  });
  if (!timesheet) throw new NotFoundError("Timesheet", id);
  if (timesheet.userId !== userId) throw new PermissionError("You can only submit your own timesheets");
  if (timesheet.status !== "draft") throw new ValidationError("Only draft timesheets can be submitted");

  return db.timesheet.update({
    where: { id },
    data: { status: "submitted", submittedAt: new Date() },
  });
}

export async function approveTimesheet(
  db: PrismaClient,
  organizationId: string,
  approverId: string,
  id: string,
) {
  const timesheet = await db.timesheet.findFirst({
    where: { id, organizationId },
  });
  if (!timesheet) throw new NotFoundError("Timesheet", id);
  if (timesheet.status !== "submitted") throw new ValidationError("Only submitted timesheets can be approved");

  return db.timesheet.update({
    where: { id },
    data: { status: "approved", approvedAt: new Date(), approvedBy: approverId },
  });
}

export async function rejectTimesheet(
  db: PrismaClient,
  organizationId: string,
  _approverId: string,
  id: string,
) {
  const timesheet = await db.timesheet.findFirst({
    where: { id, organizationId },
  });
  if (!timesheet) throw new NotFoundError("Timesheet", id);
  if (timesheet.status !== "submitted") throw new ValidationError("Only submitted timesheets can be rejected");

  return db.timesheet.update({
    where: { id },
    data: { status: "draft", submittedAt: null },
  });
}

export async function listPendingTimesheets(
  db: PrismaClient,
  organizationId: string,
  input: ListPendingTimesheetsInput,
) {
  const items = await db.timesheet.findMany({
    where: { organizationId, status: "submitted" },
    include: {
      user: { select: { id: true, name: true, image: true } },
      timeLogs: true,
    },
    orderBy: { submittedAt: "asc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  return {
    items,
    nextCursor: items.length === input.limit ? items[items.length - 1]?.id : undefined,
  };
}

// ── Time Reports ──────────────────────────────────────────────────────────

export async function myLoggedHours(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: MyLoggedHoursInput,
) {
  const timeLogs = await db.timeLog.findMany({
    where: {
      organizationId,
      userId,
      date: { gte: input.startDate, lte: input.endDate },
    },
    include: { issue: { select: { key: true, summary: true, projectId: true } } },
    orderBy: { date: "asc" },
  });

  const totalSeconds = timeLogs.reduce((sum, tl) => sum + tl.duration, 0);

  // Group by date
  const byDate: Record<string, number> = {};
  for (const tl of timeLogs) {
    const dateKey = tl.date.toISOString().split("T")[0]!;
    byDate[dateKey] = (byDate[dateKey] ?? 0) + tl.duration;
  }

  return { timeLogs, totalSeconds, byDate };
}

export async function teamLoggedHours(
  db: PrismaClient,
  organizationId: string,
  input: TeamLoggedHoursInput,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId,
    date: { gte: input.startDate, lte: input.endDate },
  };
  if (input.projectId) {
    where.issue = { projectId: input.projectId };
  }

  const timeLogs = await db.timeLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      issue: { select: { key: true, summary: true, projectId: true } },
    },
    orderBy: { date: "asc" },
  });

  const totalSeconds = timeLogs.reduce((sum, tl) => sum + tl.duration, 0);

  // Group by user
  const byUser: Record<string, { name: string; totalSeconds: number }> = {};
  for (const tl of timeLogs) {
    const userId = tl.userId;
    if (!byUser[userId]) {
      byUser[userId] = { name: tl.user.name ?? "Unknown", totalSeconds: 0 };
    }
    byUser[userId].totalSeconds += tl.duration;
  }

  return { timeLogs, totalSeconds, byUser };
}

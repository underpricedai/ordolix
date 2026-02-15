import type { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type { AddDependencyInput, GetGanttDataInput } from "../types/schemas";

export async function addDependency(
  db: PrismaClient,
  organizationId: string,
  input: AddDependencyInput,
) {
  if (input.sourceIssueId === input.targetIssueId) {
    throw new ValidationError("Cannot create dependency to self");
  }

  const sourceIssue = await db.issue.findFirst({
    where: { id: input.sourceIssueId, organizationId, deletedAt: null },
  });
  if (!sourceIssue) {
    throw new NotFoundError("Issue", input.sourceIssueId);
  }

  const targetIssue = await db.issue.findFirst({
    where: { id: input.targetIssueId, organizationId, deletedAt: null },
  });
  if (!targetIssue) {
    throw new NotFoundError("Issue", input.targetIssueId);
  }

  const existing = await db.ganttDependency.findFirst({
    where: {
      sourceIssueId: input.sourceIssueId,
      targetIssueId: input.targetIssueId,
      organizationId,
    },
  });
  if (existing) {
    throw new ConflictError("Dependency already exists between these issues");
  }

  return db.ganttDependency.create({
    data: {
      organizationId,
      sourceIssueId: input.sourceIssueId,
      targetIssueId: input.targetIssueId,
      dependencyType: input.dependencyType,
      lag: input.lag,
    },
  });
}

export async function removeDependency(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const dependency = await db.ganttDependency.findFirst({
    where: { id, organizationId },
  });
  if (!dependency) {
    throw new NotFoundError("GanttDependency", id);
  }

  await db.ganttDependency.delete({ where: { id } });
}

export async function getGanttData(
  db: PrismaClient,
  organizationId: string,
  input: GetGanttDataInput,
) {
  // Support single projectId, multiple projectIds, or all projects
  const projectFilter = input.projectIds && input.projectIds.length > 0
    ? { projectId: { in: input.projectIds } }
    : input.projectId
      ? { projectId: input.projectId }
      : {};

  const rawIssues = await db.issue.findMany({
    where: {
      organizationId,
      ...projectFilter,
      deletedAt: null,
    },
    include: {
      status: true,
      project: { select: { key: true, name: true } },
      ganttDepsSource: true,
      ganttDepsTarget: true,
    },
  });

  // Transform raw Issue objects into the shape expected by GanttChart component
  const issues = rawIssues.map((issue) => ({
    id: issue.id,
    issueKey: issue.key,
    summary: issue.summary,
    projectKey: issue.project?.key ?? "",
    projectName: issue.project?.name ?? "",
    startDate: issue.startDate?.toISOString() ?? null,
    endDate: issue.dueDate?.toISOString() ?? null,
    progress: 0,
    statusName: issue.status?.name ?? "Unknown",
    statusCategory: issue.status?.category ?? "TO_DO",
    depth: 0,
    children: [],
  }));

  // Transform dependencies into the shape expected by GanttChart
  const dependencies = rawIssues.flatMap((issue) =>
    (issue.ganttDepsSource ?? []).map((dep) => ({
      id: dep.id,
      sourceId: dep.sourceIssueId,
      targetId: dep.targetIssueId,
      type: dep.dependencyType as "FS" | "FF" | "SS" | "SF",
    })),
  );

  return { issues, dependencies };
}

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
  const issues = await db.issue.findMany({
    where: {
      organizationId,
      projectId: input.projectId,
      deletedAt: null,
    },
    include: {
      ganttDepsSource: true,
      ganttDepsTarget: true,
    },
  });

  return { issues };
}

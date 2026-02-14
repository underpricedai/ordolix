import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { validatorConfig } from "../types/schemas";
import { runValidators, type ValidatorContext } from "./validators";

const WORKFLOW_INCLUDE = {
  workflowStatuses: {
    include: { status: true },
    orderBy: { position: "asc" as const },
  },
  transitions: {
    include: { fromStatus: true, toStatus: true },
  },
};

const ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
  reporter: true,
  parent: { select: { id: true, key: true, summary: true } },
} as const;

const validatorsSchema = z.array(validatorConfig);

export async function getWorkflowForProject(
  db: PrismaClient,
  organizationId: string,
  projectId: string,
) {
  const projectWorkflow = await db.workflow.findFirst({
    where: {
      organizationId,
      projects: { some: { id: projectId } },
      isActive: true,
    },
    include: WORKFLOW_INCLUDE,
  });

  if (projectWorkflow) return projectWorkflow;

  const defaultWorkflow = await db.workflow.findFirst({
    where: {
      organizationId,
      isDefault: true,
      isActive: true,
    },
    include: WORKFLOW_INCLUDE,
  });

  if (!defaultWorkflow) {
    throw new NotFoundError("Workflow");
  }

  return defaultWorkflow;
}

export async function getAvailableTransitions(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
  });

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const workflow = await getWorkflowForProject(
    db,
    organizationId,
    issue.projectId,
  );

  return workflow.transitions
    .filter((t: { fromStatusId: string }) => t.fromStatusId === issue.statusId)
    .map((t: { id: string; name: string; toStatus: unknown }) => ({
      id: t.id,
      name: t.name,
      toStatus: t.toStatus,
    }));
}

export async function transitionIssue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueId: string,
  transitionId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
  });

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const workflow = await getWorkflowForProject(
    db,
    organizationId,
    issue.projectId,
  );

  const transition = workflow.transitions.find(
    (t: { id: string }) => t.id === transitionId,
  );
  if (!transition) {
    throw new NotFoundError("Transition", transitionId);
  }

  if (transition.fromStatusId !== issue.statusId) {
    throw new ValidationError(
      `Transition '${transition.name}' is not valid from current status`,
      { code: "WORKFLOW_TRANSITION_BLOCKED" },
    );
  }

  // Parse and run validators from transition JSON
  const parseResult = validatorsSchema.safeParse(transition.validators);
  const validators = parseResult.success ? parseResult.data : [];
  const validatorCtx: ValidatorContext = {
    db,
    organizationId,
    issue: issue as unknown as ValidatorContext["issue"],
  };
  await runValidators(validatorCtx, validators);

  return db.$transaction(async (tx) => {
    const updated = await tx.issue.update({
      where: { id: issueId },
      data: { statusId: transition.toStatusId },
      include: ISSUE_INCLUDE,
    });

    await tx.issueHistory.create({
      data: {
        organizationId,
        issueId,
        userId,
        field: "statusId",
        oldValue: issue.statusId,
        newValue: transition.toStatusId,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Issue",
        entityId: issueId,
        action: "TRANSITIONED",
        diff: {
          transitionId: transition.id,
          transitionName: transition.name,
          fromStatusId: issue.statusId,
          toStatusId: transition.toStatusId,
        },
      },
    });

    return updated;
  });
}

import type { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
} from "@/server/lib/errors";
import type {
  RequestApprovalInput,
  ListPendingApprovalsInput,
} from "../types/schemas";

const APPROVER_SELECT = {
  select: { id: true, name: true, email: true },
} as const;

export async function requestApproval(
  db: PrismaClient,
  organizationId: string,
  input: RequestApprovalInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId, deletedAt: null },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  return db.approval.create({
    data: {
      organizationId,
      issueId: input.issueId,
      approverId: input.approverId,
      expiresAt: input.expiresAt,
    },
    include: { approver: APPROVER_SELECT },
  });
}

export async function getApprovals(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  return db.approval.findMany({
    where: { organizationId, issueId },
    include: { approver: APPROVER_SELECT },
    orderBy: { createdAt: "desc" as const },
  });
}

export async function decide(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
  decision: "approved" | "rejected",
  comment?: string,
) {
  const approval = await db.approval.findFirst({
    where: { id, organizationId },
  });
  if (!approval) {
    throw new NotFoundError("Approval", id);
  }
  if (approval.approverId !== userId) {
    throw new PermissionError("Only the assigned approver can decide");
  }
  if (approval.status !== "pending") {
    throw new ValidationError("Approval has already been decided", {
      code: "APPROVAL_ALREADY_DECIDED",
      currentStatus: approval.status,
    });
  }

  return db.approval.update({
    where: { id },
    data: {
      status: decision,
      decision,
      comment,
      decidedAt: new Date(),
    },
    include: { approver: APPROVER_SELECT },
  });
}

export async function getPendingApprovals(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: ListPendingApprovalsInput,
) {
  return db.approval.findMany({
    where: {
      organizationId,
      approverId: userId,
      status: "pending",
    },
    include: {
      issue: { select: { id: true, key: true, summary: true } },
      approver: APPROVER_SELECT,
    },
    orderBy: { createdAt: "asc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

/**
 * Procurement approval service.
 *
 * @description Handles multi-stage procurement approval decisions.
 * When all stages are approved, the parent request moves to "approved".
 * When any stage is rejected, the parent request moves to "rejected".
 *
 * @module procurement-approval-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

/**
 * Records an approval decision for a procurement approval record.
 * If all approval stages are approved, the parent request status changes to "approved".
 * If any stage is rejected, the parent request status changes to "rejected".
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope (used for request validation)
 * @param approvalId - The procurement approval record ID
 * @param approverId - The user making the decision (must match the approval record)
 * @param decision - "approved" or "rejected"
 * @param comment - Optional comment with the decision
 * @returns The updated procurement approval record
 * @throws NotFoundError if approval not found
 * @throws ValidationError if approval is not pending or approver does not match
 */
export async function decideProcurementApproval(
  db: PrismaClient,
  organizationId: string,
  approvalId: string,
  approverId: string,
  decision: "approved" | "rejected",
  comment?: string | null,
) {
  const approval = await db.procurementApproval.findFirst({
    where: { id: approvalId },
    include: {
      procurementRequest: true,
    },
  });

  if (!approval) {
    throw new NotFoundError("ProcurementApproval", approvalId);
  }

  // Validate the request belongs to the organization
  if (approval.procurementRequest.organizationId !== organizationId) {
    throw new NotFoundError("ProcurementApproval", approvalId);
  }

  if (approval.status !== "pending") {
    throw new ValidationError(
      `Approval has already been decided with status '${approval.status}'.`,
    );
  }

  if (approval.approverId !== approverId) {
    throw new ValidationError(
      "Only the assigned approver can make this decision.",
    );
  }

  // Update the approval record
  const updatedApproval = await db.procurementApproval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      comment: comment ?? null,
      decidedAt: new Date(),
    },
  });

  // Determine the aggregate status of all approvals for this request
  if (decision === "rejected") {
    // If any stage is rejected, reject the entire request
    await db.procurementRequest.update({
      where: { id: approval.procurementRequestId },
      data: { status: "rejected" },
    });
  } else {
    // Check if all approvals for this request are approved
    const pendingCount = await db.procurementApproval.count({
      where: {
        procurementRequestId: approval.procurementRequestId,
        status: "pending",
      },
    });

    if (pendingCount === 0) {
      // All stages approved
      await db.procurementRequest.update({
        where: { id: approval.procurementRequestId },
        data: { status: "approved" },
      });
    }
  }

  return updatedApproval;
}

/**
 * Gets all pending approvals for a given approver.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param approverId - The user whose pending approvals to retrieve
 * @returns Array of pending procurement approvals with their requests
 */
export async function getPendingApprovals(
  db: PrismaClient,
  organizationId: string,
  approverId: string,
) {
  return db.procurementApproval.findMany({
    where: {
      approverId,
      status: "pending",
      procurementRequest: {
        organizationId,
      },
    },
    include: {
      procurementRequest: {
        include: { vendor: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

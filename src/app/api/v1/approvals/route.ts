/**
 * REST API v1 approvals collection endpoints.
 *
 * - GET /api/v1/approvals — List pending approvals for the authenticated user
 * - POST /api/v1/approvals — Create an approval request
 *
 * @module api-v1-approvals
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing approvals */
const listQuerySchema = z.object({
  status: z.string().optional(),
  issueId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating approval requests */
const createApprovalInput = z.object({
  issueId: z.string().min(1),
  approverIds: z.array(z.string().min(1)).min(1),
  type: z.string().min(1),
});

const APPROVAL_SELECT = {
  id: true,
  issueId: true,
  approverId: true,
  status: true,
  decision: true,
  comment: true,
  delegatedTo: true,
  expiresAt: true,
  decidedAt: true,
  createdAt: true,
  issue: {
    select: {
      id: true,
      key: true,
      summary: true,
    },
  },
  approver: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

/**
 * GET /api/v1/approvals
 *
 * Lists pending approvals for the authenticated user's organization.
 * By default returns approvals assigned to the current user.
 * Supports filtering by status and issueId.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    approverId: ctx.userId,
    ...(input.status ? { status: input.status } : { status: "pending" }),
    ...(input.issueId ? { issueId: input.issueId } : {}),
  };

  const [approvals, total] = await Promise.all([
    db.approval.findMany({
      where,
      select: APPROVAL_SELECT,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.approval.count({ where }),
  ]);

  const nextCursor =
    approvals.length > 0
      ? approvals[approvals.length - 1]?.id ?? null
      : null;

  return res.success(
    approvals,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/approvals
 *
 * Creates approval requests for the specified issue.
 * One Approval record is created per approver in approverIds.
 * Returns the array of created approvals.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createApprovalInput.parse(body);

  const approvals = await db.$transaction(
    input.approverIds.map((approverId) =>
      db.approval.create({
        data: {
          organizationId: ctx.organizationId,
          issueId: input.issueId,
          approverId,
          status: "pending",
        },
        select: APPROVAL_SELECT,
      }),
    ),
  );

  return res.created(approvals, ctx.rateLimit);
});

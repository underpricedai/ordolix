/**
 * REST API v1 issue comments endpoints.
 *
 * - GET /api/v1/issues/:id/comments — List comments on an issue
 * - POST /api/v1/issues/:id/comments — Add a comment to an issue
 *
 * @module api-v1-issues-comments
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import { NotFoundError } from "@/server/lib/errors";

/** Schema for creating a comment */
const createCommentInput = z.object({
  body: z.string().min(1).max(32000),
  isInternal: z.boolean().default(false),
});

/** Schema for listing comments query params */
const listCommentsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const COMMENT_INCLUDE = {
  author: {
    select: { id: true, name: true, email: true, image: true },
  },
} as const;

/**
 * GET /api/v1/issues/:id/comments
 *
 * Returns a paginated list of comments for the specified issue,
 * ordered by creation time (oldest first).
 */
export const GET = apiHandler(async (request, ctx, params) => {
  const { id: issueId } = params;

  if (!issueId) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  // Verify the issue exists and belongs to the org
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });
  const input = listCommentsQuery.parse(rawParams);

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where: { issueId, organizationId: ctx.organizationId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.comment.count({
      where: { issueId, organizationId: ctx.organizationId },
    }),
  ]);

  const nextCursor =
    comments.length > 0
      ? comments[comments.length - 1]?.id ?? null
      : null;

  return res.success(
    comments,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/issues/:id/comments
 *
 * Adds a new comment to the specified issue. Creates an audit log entry.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id: issueId } = params;

  if (!issueId) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  // Verify the issue exists and belongs to the org
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, key: true },
  });

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const body = await request.json();
  const input = createCommentInput.parse(body);

  const comment = await db.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        organizationId: ctx.organizationId,
        issueId,
        authorId: ctx.userId,
        body: input.body,
        isInternal: input.isInternal,
      },
      include: COMMENT_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        entityType: "Comment",
        entityId: created.id,
        action: "CREATED",
        diff: { issueId, issueKey: issue.key },
      },
    });

    return created;
  });

  return res.created(comment, ctx.rateLimit);
});

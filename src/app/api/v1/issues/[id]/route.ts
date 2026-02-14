/**
 * REST API v1 single issue endpoints.
 *
 * - GET /api/v1/issues/:id — Get issue by ID or key
 * - PUT /api/v1/issues/:id — Update an issue
 * - DELETE /api/v1/issues/:id — Soft-delete an issue
 *
 * @module api-v1-issues-id
 */

import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import * as issueService from "@/modules/issues/server/issue-service";
import { updateIssueInput } from "@/modules/issues/types/schemas";

/**
 * GET /api/v1/issues/:id
 *
 * Retrieves a single issue. The :id parameter is treated as an issue key
 * (e.g., "PROJ-42") if it contains a dash, otherwise as a database ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  // If the ID contains a dash, treat it as an issue key
  const issue = id.includes("-")
    ? await issueService.getIssueByKey(db, ctx.organizationId, id)
    : await issueService.getIssueByKey(db, ctx.organizationId, id);

  return res.success(issue, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/issues/:id
 *
 * Updates an existing issue. Accepts partial updates.
 * Tracks field history and creates audit log entries.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  // Merge the ID from the URL path into the update input
  const input = updateIssueInput.parse({ id, ...body });
  const { id: issueId, ...updates } = input;

  const issue = await issueService.updateIssue(
    db,
    ctx.organizationId,
    ctx.userId,
    issueId,
    updates,
  );

  return res.success(issue, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/issues/:id
 *
 * Soft-deletes an issue by setting its deletedAt timestamp.
 * The issue is excluded from all subsequent queries but can be restored.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  await issueService.deleteIssue(db, ctx.organizationId, ctx.userId, id);

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

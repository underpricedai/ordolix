/**
 * REST API v1 issues collection endpoints.
 *
 * - GET /api/v1/issues — List issues with optional filters and AQL query
 * - POST /api/v1/issues — Create a new issue
 *
 * @module api-v1-issues
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import * as issueService from "@/modules/issues/server/issue-service";
import { createIssueInput } from "@/modules/issues/types/schemas";

/** Query parameters for listing issues */
const listQuerySchema = z.object({
  projectId: z.string().min(1),
  statusId: z.string().optional(),
  assigneeId: z.string().optional(),
  issueTypeId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z
    .enum(["createdAt", "updatedAt", "priority", "rank"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/v1/issues
 *
 * Lists issues for the authenticated organization, scoped by projectId.
 * Supports filtering by status, assignee, issue type, and search text.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const result = await issueService.listIssues(db, ctx.organizationId, input);

  const nextCursor =
    result.items.length > 0
      ? result.items[result.items.length - 1]?.id ?? null
      : null;

  return res.success(
    result.items,
    {
      total: result.total,
      nextCursor,
      requestId: ctx.requestId,
    },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/issues
 *
 * Creates a new issue in the authenticated organization.
 * Requires at minimum: projectId, summary, and issueTypeId.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createIssueInput.parse(body);

  const issue = await issueService.createIssue(
    db,
    ctx.organizationId,
    ctx.userId,
    input,
  );

  return res.created(issue, ctx.rateLimit);
});

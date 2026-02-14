/**
 * REST API v1 time entries collection endpoints.
 *
 * - GET /api/v1/time-entries — List time entries with filters
 * - POST /api/v1/time-entries — Create a time entry
 *
 * @module api-v1-time-entries
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import * as timeTrackingService from "@/modules/time-tracking/server/time-tracking-service";
import { logTimeInput } from "@/modules/time-tracking/types/schemas";

/** Query parameters for listing time entries */
const listQuerySchema = z.object({
  issueId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /api/v1/time-entries
 *
 * Lists time entries for the authenticated organization.
 * Supports filtering by issue, user, and date range.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const result = await timeTrackingService.listTimeLogs(
    db,
    ctx.organizationId,
    {
      issueId: input.issueId,
      userId: input.userId,
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit,
      cursor: input.cursor,
    },
  );

  return res.success(
    result.items,
    {
      nextCursor: result.nextCursor ?? null,
      requestId: ctx.requestId,
    },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/time-entries
 *
 * Creates a new time entry for the authenticated user.
 * Requires: issueId, date, duration (in seconds).
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = logTimeInput.parse(body);

  const timeLog = await timeTrackingService.logTime(
    db,
    ctx.organizationId,
    ctx.userId,
    input,
  );

  return res.created(timeLog, ctx.rateLimit);
});

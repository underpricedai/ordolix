/**
 * REST API v1 single time entry endpoints.
 *
 * - GET /api/v1/time-entries/:id — Get a time entry
 * - PUT /api/v1/time-entries/:id — Update a time entry
 * - DELETE /api/v1/time-entries/:id — Delete a time entry
 *
 * @module api-v1-time-entries-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import * as timeTrackingService from "@/modules/time-tracking/server/time-tracking-service";

/** Update time entry input schema */
const updateTimeEntryInput = z.object({
  date: z.coerce.date().optional(),
  duration: z.number().int().positive().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});

/**
 * GET /api/v1/time-entries/:id
 *
 * Retrieves a single time entry by ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest(
      "Time entry ID is required",
      undefined,
      ctx.rateLimit,
    );
  }

  const timeLog = await timeTrackingService.getTimeLog(
    db,
    ctx.organizationId,
    id,
  );

  return res.success(timeLog, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/time-entries/:id
 *
 * Updates an existing time entry. Only the entry's owner can update it.
 * Accepts partial updates for date, duration, description, billable.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest(
      "Time entry ID is required",
      undefined,
      ctx.rateLimit,
    );
  }

  const body = await request.json();
  const input = updateTimeEntryInput.parse(body);

  const timeLog = await timeTrackingService.updateTimeLog(
    db,
    ctx.organizationId,
    ctx.userId,
    id,
    input,
  );

  return res.success(timeLog, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/time-entries/:id
 *
 * Deletes a time entry. Only the entry's owner can delete it.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest(
      "Time entry ID is required",
      undefined,
      ctx.rateLimit,
    );
  }

  await timeTrackingService.deleteTimeLog(
    db,
    ctx.organizationId,
    ctx.userId,
    id,
  );

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

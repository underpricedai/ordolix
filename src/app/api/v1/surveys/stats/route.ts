/**
 * REST API v1 survey statistics endpoint.
 *
 * - GET /api/v1/surveys/stats — Get aggregate CSAT statistics
 *
 * @module api-v1-surveys-stats
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import * as surveyService from "@/modules/surveys/server/survey-service";

/** Query parameters for stats */
const statsQuerySchema = z.object({
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/**
 * GET /api/v1/surveys/stats
 *
 * Returns aggregate survey statistics including average rating,
 * response count, distribution, and trend data.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = statsQuerySchema.parse(rawParams);

  const stats = await surveyService.getSurveyStats(db, ctx.organizationId, input);

  return res.success(stats, { requestId: ctx.requestId }, ctx.rateLimit);
});

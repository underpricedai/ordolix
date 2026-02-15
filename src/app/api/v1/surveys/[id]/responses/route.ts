/**
 * REST API v1 survey response endpoints for a specific template.
 *
 * - GET /api/v1/surveys/:id/responses — List responses for a template
 * - POST /api/v1/surveys/:id/responses — Submit a response
 *
 * @module api-v1-surveys-id-responses
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import * as surveyService from "@/modules/surveys/server/survey-service";

/** Query parameters for listing responses */
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for submitting a response */
const submitInput = z.object({
  issueId: z.string().optional(),
  respondentEmail: z.string().email().optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
  comment: z.string().max(5000).optional(),
});

/**
 * GET /api/v1/surveys/:id/responses
 *
 * Lists paginated responses for a survey template.
 */
export const GET = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Survey template ID is required", undefined, ctx.rateLimit);
  }

  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });
  const input = listQuerySchema.parse(rawParams);

  const result = await surveyService.getResponsesForTemplate(
    db, ctx.organizationId, id, input,
  );

  return res.success(
    result.items,
    { nextCursor: result.nextCursor ?? null, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/surveys/:id/responses
 *
 * Submits a new survey response.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Survey template ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = submitInput.parse(body);

  const response = await surveyService.submitResponse(
    db,
    ctx.organizationId,
    { ...input, templateId: id },
    ctx.userId ?? undefined,
  );

  return res.created(response, ctx.rateLimit);
});

/**
 * REST API v1 single survey template endpoints.
 *
 * - GET /api/v1/surveys/:id — Get template by ID
 * - PUT /api/v1/surveys/:id — Update a template
 *
 * @module api-v1-surveys-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import * as surveyService from "@/modules/surveys/server/survey-service";

/** Input schema for updating a template */
const updateInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  trigger: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  delayMinutes: z.number().int().min(0).max(10080).optional(),
  questions: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["text", "rating", "select", "multiselect"]),
    label: z.string().min(1),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).optional(),
});

/**
 * GET /api/v1/surveys/:id
 *
 * Retrieves a single survey template by ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Survey template ID is required", undefined, ctx.rateLimit);
  }

  try {
    const template = await surveyService.getTemplate(db, ctx.organizationId, id);
    return res.success(template, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch {
    return res.notFound("SurveyTemplate", id, ctx.rateLimit);
  }
});

/**
 * PUT /api/v1/surveys/:id
 *
 * Updates an existing survey template.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Survey template ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateInput.parse(body);

  try {
    const template = await surveyService.updateTemplate(
      db, ctx.organizationId, id, input,
    );
    return res.success(template, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number };
      if (appError.statusCode === 404) {
        return res.notFound("SurveyTemplate", id, ctx.rateLimit);
      }
    }
    throw error;
  }
});

/**
 * REST API v1 survey template collection endpoints.
 *
 * - GET /api/v1/surveys — List survey templates
 * - POST /api/v1/surveys — Create a new survey template
 *
 * @module api-v1-surveys
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import * as surveyService from "@/modules/surveys/server/survey-service";

/** Input schema for creating a template */
const createInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  trigger: z.string().min(1).default("issue_resolved"),
  isActive: z.boolean().default(true),
  delayMinutes: z.number().int().min(0).max(10080).default(30),
  questions: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["text", "rating", "select", "multiselect"]),
    label: z.string().min(1),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).default([]),
});

/**
 * GET /api/v1/surveys
 *
 * Lists all survey templates for the authenticated organization.
 */
export const GET = apiHandler(async (_request, ctx) => {
  const templates = await surveyService.listTemplates(db, ctx.organizationId);
  return res.success(templates, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * POST /api/v1/surveys
 *
 * Creates a new survey template.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createInput.parse(body);

  const template = await surveyService.createTemplate(db, ctx.organizationId, input);
  return res.created(template, ctx.rateLimit);
});

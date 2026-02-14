/**
 * REST API v1 form template resource endpoints.
 *
 * - GET /api/v1/forms/:id — Get a form template by ID
 * - PUT /api/v1/forms/:id — Update a form template
 * - DELETE /api/v1/forms/:id — Delete a form template
 *
 * @module api-v1-forms-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { type Prisma } from "@prisma/client";

/** Input schema for updating a form template */
const updateFormInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const FORM_TEMPLATE_SELECT = {
  id: true,
  name: true,
  description: true,
  config: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/forms/:id
 *
 * Returns a single form template by ID, scoped to the authenticated organization.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const template = await db.formTemplate.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
    },
    select: FORM_TEMPLATE_SELECT,
  });

  if (!template) {
    return res.notFound("FormTemplate", params.id, ctx.rateLimit);
  }

  return res.success(template, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/forms/:id
 *
 * Updates a form template. Only provided fields are changed.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const existing = await db.formTemplate.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("FormTemplate", params.id, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateFormInput.parse(body);

  const template = await db.formTemplate.update({
    where: { id: params.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.schema !== undefined
        ? { config: input.schema as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: FORM_TEMPLATE_SELECT,
  });

  return res.success(template, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/forms/:id
 *
 * Deletes a form template. Cascades to related submissions.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const existing = await db.formTemplate.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("FormTemplate", params.id, ctx.rateLimit);
  }

  await db.formTemplate.delete({
    where: { id: params.id },
  });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

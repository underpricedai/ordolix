/**
 * REST API v1 single custom field endpoints.
 *
 * - GET /api/v1/custom-fields/:id — Get custom field by ID
 * - PUT /api/v1/custom-fields/:id — Update a custom field
 * - DELETE /api/v1/custom-fields/:id — Delete a custom field
 *
 * @module api-v1-custom-fields-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { type Prisma } from "@prisma/client";

/** Input schema for updating a custom field */
const updateCustomFieldInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  options: z.unknown().optional(),
  defaultValue: z.unknown().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  isRequired: z.boolean().optional(),
  aggregation: z.enum(["sum", "min", "max", "avg"]).nullable().optional(),
});

const CUSTOM_FIELD_SELECT = {
  id: true,
  name: true,
  fieldType: true,
  description: true,
  options: true,
  defaultValue: true,
  context: true,
  isRequired: true,
  aggregation: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/custom-fields/:id
 *
 * Retrieves a single custom field by ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Custom field ID is required", undefined, ctx.rateLimit);
  }

  const field = await db.customField.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: CUSTOM_FIELD_SELECT,
  });

  if (!field) {
    return res.notFound("CustomField", id, ctx.rateLimit);
  }

  return res.success(field, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/custom-fields/:id
 *
 * Updates an existing custom field. Accepts partial updates for name,
 * description, options, defaultValue, context, isRequired, and aggregation.
 * The fieldType cannot be changed after creation.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Custom field ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateCustomFieldInput.parse(body);

  const existing = await db.customField.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("CustomField", id, ctx.rateLimit);
  }

  const data: Prisma.CustomFieldUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.options !== undefined) data.options = input.options as Prisma.InputJsonValue;
  if (input.defaultValue !== undefined) data.defaultValue = input.defaultValue as Prisma.InputJsonValue;
  if (input.context !== undefined) data.context = input.context as unknown as Prisma.InputJsonValue;
  if (input.isRequired !== undefined) data.isRequired = input.isRequired;
  if (input.aggregation !== undefined) data.aggregation = input.aggregation;

  const field = await db.customField.update({
    where: { id },
    data,
    select: CUSTOM_FIELD_SELECT,
  });

  return res.success(field, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/custom-fields/:id
 *
 * Permanently deletes a custom field and all its values.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Custom field ID is required", undefined, ctx.rateLimit);
  }

  const existing = await db.customField.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("CustomField", id, ctx.rateLimit);
  }

  await db.customField.delete({ where: { id } });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

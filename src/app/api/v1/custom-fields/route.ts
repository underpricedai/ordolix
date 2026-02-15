/**
 * REST API v1 custom fields collection endpoints.
 *
 * - GET /api/v1/custom-fields — List custom fields
 * - POST /api/v1/custom-fields — Create a custom field
 *
 * @module api-v1-custom-fields
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing custom fields */
const listQuerySchema = z.object({
  fieldType: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a custom field */
const createCustomFieldInput = z.object({
  name: z.string().min(1).max(255),
  fieldType: z.enum([
    "text",
    "number",
    "date",
    "datetime",
    "select",
    "multiselect",
    "checkbox",
    "url",
    "user",
    "labels",
  ]),
  description: z.string().max(1000).optional(),
  options: z.unknown().optional(),
  defaultValue: z.unknown().optional(),
  context: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean().default(false),
  aggregation: z.enum(["sum", "min", "max", "avg"]).optional(),
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
 * GET /api/v1/custom-fields
 *
 * Lists custom fields for the authenticated organization.
 * Supports filtering by field type and search text.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    ...(input.fieldType ? { fieldType: input.fieldType } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [fields, total] = await Promise.all([
    db.customField.findMany({
      where,
      select: CUSTOM_FIELD_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.customField.count({ where }),
  ]);

  const nextCursor =
    fields.length > 0 ? fields[fields.length - 1]?.id ?? null : null;

  return res.success(
    fields,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/custom-fields
 *
 * Creates a new custom field for the authenticated organization.
 * Requires: name and fieldType.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createCustomFieldInput.parse(body);

  const field = await db.customField.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      fieldType: input.fieldType,
      description: input.description,
      options: input.options as Prisma.InputJsonValue ?? undefined,
      defaultValue: input.defaultValue as Prisma.InputJsonValue ?? undefined,
      context: input.context as unknown as Prisma.InputJsonValue,
      isRequired: input.isRequired,
      aggregation: input.aggregation,
    },
    select: CUSTOM_FIELD_SELECT,
  });

  return res.created(field, ctx.rateLimit);
});

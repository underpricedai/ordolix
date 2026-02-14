/**
 * REST API v1 form templates collection endpoints.
 *
 * - GET /api/v1/forms — List form templates
 * - POST /api/v1/forms — Create a form template
 *
 * @module api-v1-forms
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing form templates */
const listQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "true";
    }),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a form template */
const createFormInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
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
 * GET /api/v1/forms
 *
 * Lists form templates for the authenticated organization.
 * Supports filtering by active status and search text.
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
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [templates, total] = await Promise.all([
    db.formTemplate.findMany({
      where,
      select: FORM_TEMPLATE_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.formTemplate.count({ where }),
  ]);

  const nextCursor =
    templates.length > 0
      ? templates[templates.length - 1]?.id ?? null
      : null;

  return res.success(
    templates,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/forms
 *
 * Creates a new form template for the authenticated organization.
 * Requires: name and schema. The schema is stored in the config JSON field.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createFormInput.parse(body);

  const template = await db.formTemplate.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      description: input.description,
      config: input.schema as unknown as Prisma.InputJsonValue,
      isActive: input.isActive,
    },
    select: FORM_TEMPLATE_SELECT,
  });

  return res.created(template, ctx.rateLimit);
});

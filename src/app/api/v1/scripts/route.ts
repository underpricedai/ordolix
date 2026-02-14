/**
 * REST API v1 scripts collection endpoints.
 *
 * - GET /api/v1/scripts — List scripts
 * - POST /api/v1/scripts — Create a script
 *
 * @module api-v1-scripts
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing scripts */
const listQuerySchema = z.object({
  triggerType: z.string().optional(),
  isEnabled: z
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

/** Input schema for creating a script */
const createScriptInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  language: z.string().min(1),
  code: z.string().min(1),
  isEnabled: z.boolean().default(true),
});

const SCRIPT_SELECT = {
  id: true,
  name: true,
  description: true,
  triggerType: true,
  code: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/scripts
 *
 * Lists scripts for the authenticated organization.
 * Supports filtering by trigger type, enabled status, and search text.
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
    ...(input.triggerType ? { triggerType: input.triggerType } : {}),
    ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [scripts, total] = await Promise.all([
    db.script.findMany({
      where,
      select: SCRIPT_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.script.count({ where }),
  ]);

  const nextCursor =
    scripts.length > 0
      ? scripts[scripts.length - 1]?.id ?? null
      : null;

  return res.success(
    scripts,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/scripts
 *
 * Creates a new script for the authenticated organization.
 * The language field is mapped to triggerType in the data model.
 * Requires: name, language, and code.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createScriptInput.parse(body);

  const script = await db.script.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      description: input.description,
      triggerType: input.language,
      code: input.code,
      isEnabled: input.isEnabled,
    },
    select: SCRIPT_SELECT,
  });

  return res.created(script, ctx.rateLimit);
});

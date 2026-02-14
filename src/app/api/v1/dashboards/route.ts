/**
 * REST API v1 dashboards collection endpoints.
 *
 * - GET /api/v1/dashboards — List dashboards (personal + shared)
 * - POST /api/v1/dashboards — Create a dashboard
 *
 * @module api-v1-dashboards
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing dashboards */
const listQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a dashboard */
const createDashboardInput = z.object({
  name: z.string().min(1).max(255),
  isShared: z.boolean().default(false),
  layout: z.array(z.record(z.string(), z.unknown())).default([]),
});

const DASHBOARD_SELECT = {
  id: true,
  name: true,
  ownerId: true,
  isShared: true,
  layout: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/dashboards
 *
 * Lists dashboards for the authenticated organization.
 * Returns dashboards owned by the current user plus shared dashboards.
 * Supports search by name. Pagination is cursor-based.
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
    OR: [{ ownerId: ctx.userId }, { isShared: true }],
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [dashboards, total] = await Promise.all([
    db.dashboard.findMany({
      where,
      select: DASHBOARD_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.dashboard.count({ where }),
  ]);

  const nextCursor =
    dashboards.length > 0
      ? dashboards[dashboards.length - 1]?.id ?? null
      : null;

  return res.success(
    dashboards,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/dashboards
 *
 * Creates a new dashboard for the authenticated user.
 * Requires: name. Optional: isShared, layout.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createDashboardInput.parse(body);

  const dashboard = await db.dashboard.create({
    data: {
      organizationId: ctx.organizationId,
      ownerId: ctx.userId,
      name: input.name,
      isShared: input.isShared,
      layout: input.layout as unknown as Prisma.InputJsonValue,
    },
    select: DASHBOARD_SELECT,
  });

  return res.created(dashboard, ctx.rateLimit);
});

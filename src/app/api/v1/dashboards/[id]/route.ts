/**
 * REST API v1 dashboard resource endpoints.
 *
 * - GET /api/v1/dashboards/:id — Get a dashboard by ID with widgets
 * - PUT /api/v1/dashboards/:id — Update a dashboard
 * - DELETE /api/v1/dashboards/:id — Delete a dashboard
 *
 * @module api-v1-dashboards-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { type Prisma } from "@prisma/client";

/** Input schema for updating a dashboard */
const updateDashboardInput = z.object({
  name: z.string().min(1).max(255).optional(),
  isShared: z.boolean().optional(),
  layout: z.array(z.record(z.string(), z.unknown())).optional(),
});

const DASHBOARD_DETAIL_SELECT = {
  id: true,
  name: true,
  ownerId: true,
  isShared: true,
  layout: true,
  createdAt: true,
  updatedAt: true,
  widgets: {
    select: {
      id: true,
      widgetType: true,
      title: true,
      config: true,
      position: true,
      createdAt: true,
    },
  },
} as const;

/**
 * GET /api/v1/dashboards/:id
 *
 * Returns a single dashboard by ID with its widgets.
 * Only accessible if the user owns the dashboard or if it is shared.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const dashboard = await db.dashboard.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
      OR: [{ ownerId: ctx.userId }, { isShared: true }],
    },
    select: DASHBOARD_DETAIL_SELECT,
  });

  if (!dashboard) {
    return res.notFound("Dashboard", params.id, ctx.rateLimit);
  }

  return res.success(
    dashboard,
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * PUT /api/v1/dashboards/:id
 *
 * Updates a dashboard. Only the owner can update a dashboard.
 * Only provided fields are changed.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const existing = await db.dashboard.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
      ownerId: ctx.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Dashboard", params.id, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateDashboardInput.parse(body);

  const dashboard = await db.dashboard.update({
    where: { id: params.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
      ...(input.layout !== undefined
        ? { layout: input.layout as unknown as Prisma.InputJsonValue }
        : {}),
    },
    select: DASHBOARD_DETAIL_SELECT,
  });

  return res.success(
    dashboard,
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * DELETE /api/v1/dashboards/:id
 *
 * Deletes a dashboard. Only the owner can delete a dashboard.
 * Cascades to related widgets.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const existing = await db.dashboard.findFirst({
    where: {
      id: params.id,
      organizationId: ctx.organizationId,
      ownerId: ctx.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Dashboard", params.id, ctx.rateLimit);
  }

  await db.dashboard.delete({
    where: { id: params.id },
  });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

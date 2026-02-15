/**
 * REST API v1 single sprint endpoints.
 *
 * - GET /api/v1/sprints/:id — Get sprint by ID
 * - PUT /api/v1/sprints/:id — Update a sprint
 * - DELETE /api/v1/sprints/:id — Delete a sprint
 *
 * @module api-v1-sprints-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";

/** Input schema for updating a sprint */
const updateSprintInput = z.object({
  name: z.string().min(1).max(255).optional(),
  goal: z.string().max(2000).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(["future", "active", "closed"]).optional(),
});

const SPRINT_SELECT = {
  id: true,
  projectId: true,
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { issues: true },
  },
} as const;

/**
 * GET /api/v1/sprints/:id
 *
 * Retrieves a single sprint by ID, including issue count.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Sprint ID is required", undefined, ctx.rateLimit);
  }

  const sprint = await db.sprint.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: SPRINT_SELECT,
  });

  if (!sprint) {
    return res.notFound("Sprint", id, ctx.rateLimit);
  }

  return res.success(sprint, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/sprints/:id
 *
 * Updates an existing sprint. Accepts partial updates for name,
 * goal, startDate, endDate, and status.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Sprint ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateSprintInput.parse(body);

  const existing = await db.sprint.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Sprint", id, ctx.rateLimit);
  }

  const sprint = await db.sprint.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.goal !== undefined ? { goal: input.goal } : {}),
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(input.startDate) : null }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    select: SPRINT_SELECT,
  });

  return res.success(sprint, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/sprints/:id
 *
 * Permanently deletes a sprint. Issues in the sprint are unlinked
 * (their sprintId is set to null), not deleted.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Sprint ID is required", undefined, ctx.rateLimit);
  }

  const existing = await db.sprint.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Sprint", id, ctx.rateLimit);
  }

  await db.sprint.delete({ where: { id } });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

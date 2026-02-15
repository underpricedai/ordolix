/**
 * REST API v1 sprints collection endpoints.
 *
 * - GET /api/v1/sprints — List sprints (with optional project filter)
 * - POST /api/v1/sprints — Create a new sprint
 *
 * @module api-v1-sprints
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing sprints */
const listQuerySchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(["future", "active", "closed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a sprint */
const createSprintInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  goal: z.string().max(2000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["future", "active", "closed"]).default("future"),
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
 * GET /api/v1/sprints
 *
 * Lists sprints for the authenticated organization, scoped by projectId.
 * Supports filtering by status. Pagination is cursor-based.
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
    projectId: input.projectId,
    ...(input.status ? { status: input.status } : {}),
  };

  const [sprints, total] = await Promise.all([
    db.sprint.findMany({
      where,
      select: SPRINT_SELECT,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.sprint.count({ where }),
  ]);

  const nextCursor =
    sprints.length > 0 ? sprints[sprints.length - 1]?.id ?? null : null;

  return res.success(
    sprints,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/sprints
 *
 * Creates a new sprint for the authenticated organization.
 * Requires: projectId and name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createSprintInput.parse(body);

  const sprint = await db.sprint.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      name: input.name,
      goal: input.goal,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      status: input.status,
    },
    select: SPRINT_SELECT,
  });

  return res.created(sprint, ctx.rateLimit);
});

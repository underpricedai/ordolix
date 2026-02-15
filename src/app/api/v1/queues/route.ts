/**
 * REST API v1 queues collection endpoints.
 *
 * - GET /api/v1/queues — List queues (with optional project filter)
 * - POST /api/v1/queues — Create a new queue
 *
 * @module api-v1-queues
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing queues */
const listQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a queue */
const createQueueInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  filterQuery: z.string().max(2000).optional(),
  sortBy: z.string().default("priority"),
  assignmentRule: z.record(z.string(), z.unknown()).default({}),
});

const QUEUE_SELECT = {
  id: true,
  projectId: true,
  name: true,
  filterQuery: true,
  sortBy: true,
  assignmentRule: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      key: true,
    },
  },
} as const;

/**
 * GET /api/v1/queues
 *
 * Lists queues for the authenticated organization.
 * Optionally filtered by projectId. Pagination is cursor-based.
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
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };

  const [queues, total] = await Promise.all([
    db.queue.findMany({
      where,
      select: QUEUE_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.queue.count({ where }),
  ]);

  const nextCursor =
    queues.length > 0 ? queues[queues.length - 1]?.id ?? null : null;

  return res.success(
    queues,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/queues
 *
 * Creates a new queue for the authenticated organization.
 * Requires: projectId and name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createQueueInput.parse(body);

  const queue = await db.queue.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      name: input.name,
      filterQuery: input.filterQuery,
      sortBy: input.sortBy,
      assignmentRule: input.assignmentRule as unknown as Prisma.InputJsonValue,
    },
    select: QUEUE_SELECT,
  });

  return res.created(queue, ctx.rateLimit);
});

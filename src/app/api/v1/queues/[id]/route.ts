/**
 * REST API v1 single queue endpoints.
 *
 * - GET /api/v1/queues/:id — Get queue by ID
 * - PUT /api/v1/queues/:id — Update a queue
 * - DELETE /api/v1/queues/:id — Delete a queue
 *
 * @module api-v1-queues-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { type Prisma } from "@prisma/client";

/** Input schema for updating a queue */
const updateQueueInput = z.object({
  name: z.string().min(1).max(255).optional(),
  filterQuery: z.string().max(2000).nullable().optional(),
  sortBy: z.string().optional(),
  assignmentRule: z.record(z.string(), z.unknown()).optional(),
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
 * GET /api/v1/queues/:id
 *
 * Retrieves a single queue by ID, including its project reference.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Queue ID is required", undefined, ctx.rateLimit);
  }

  const queue = await db.queue.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: QUEUE_SELECT,
  });

  if (!queue) {
    return res.notFound("Queue", id, ctx.rateLimit);
  }

  return res.success(queue, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/queues/:id
 *
 * Updates an existing queue. Accepts partial updates for name,
 * filterQuery, sortBy, and assignmentRule.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Queue ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateQueueInput.parse(body);

  const existing = await db.queue.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Queue", id, ctx.rateLimit);
  }

  const data: Prisma.QueueUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.filterQuery !== undefined) data.filterQuery = input.filterQuery;
  if (input.sortBy !== undefined) data.sortBy = input.sortBy;
  if (input.assignmentRule !== undefined) {
    data.assignmentRule = input.assignmentRule as unknown as Prisma.InputJsonValue;
  }

  const queue = await db.queue.update({
    where: { id },
    data,
    select: QUEUE_SELECT,
  });

  return res.success(queue, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/queues/:id
 *
 * Permanently deletes a queue.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Queue ID is required", undefined, ctx.rateLimit);
  }

  const existing = await db.queue.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Queue", id, ctx.rateLimit);
  }

  await db.queue.delete({ where: { id } });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

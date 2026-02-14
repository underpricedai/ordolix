/**
 * REST API v1 retrospectives collection endpoints.
 *
 * - GET /api/v1/retrospectives — List retrospectives
 * - POST /api/v1/retrospectives — Create a retrospective
 *
 * @module api-v1-retrospectives
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing retrospectives */
const listQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a retrospective */
const createRetrospectiveInput = z.object({
  title: z.string().min(1).max(255),
  projectId: z.string().min(1),
  sprintId: z.string().optional(),
  status: z.string().default("active"),
});

const RETROSPECTIVE_SELECT = {
  id: true,
  name: true,
  projectId: true,
  sprintId: true,
  status: true,
  categories: true,
  createdAt: true,
  updatedAt: true,
  cards: {
    select: {
      id: true,
      authorId: true,
      category: true,
      text: true,
      votes: true,
      linkedIssueId: true,
      createdAt: true,
    },
  },
} as const;

/**
 * GET /api/v1/retrospectives
 *
 * Lists retrospectives for the authenticated organization.
 * Supports filtering by projectId and status.
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
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const [retrospectives, total] = await Promise.all([
    db.retrospective.findMany({
      where,
      select: RETROSPECTIVE_SELECT,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.retrospective.count({ where }),
  ]);

  const nextCursor =
    retrospectives.length > 0
      ? retrospectives[retrospectives.length - 1]?.id ?? null
      : null;

  return res.success(
    retrospectives,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/retrospectives
 *
 * Creates a new retrospective for the authenticated organization.
 * The title field maps to the name column in the data model.
 * Requires: title and projectId.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createRetrospectiveInput.parse(body);

  const retrospective = await db.retrospective.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      name: input.title,
      sprintId: input.sprintId,
      status: input.status,
    },
    select: RETROSPECTIVE_SELECT,
  });

  return res.created(retrospective, ctx.rateLimit);
});

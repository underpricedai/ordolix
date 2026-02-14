/**
 * REST API v1 workflows collection endpoints.
 *
 * - GET /api/v1/workflows — List workflows
 * - POST /api/v1/workflows — Create a new workflow
 *
 * @module api-v1-workflows
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing workflows */
const listQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a workflow */
const createWorkflowInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const WORKFLOW_SELECT = {
  id: true,
  name: true,
  description: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      workflowStatuses: true,
      transitions: true,
      projects: true,
    },
  },
} as const;

/**
 * GET /api/v1/workflows
 *
 * Lists workflows for the authenticated organization.
 * By default excludes inactive workflows unless includeInactive=true.
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
    ...(!input.includeInactive ? { isActive: true } : {}),
  };

  const [workflows, total] = await Promise.all([
    db.workflow.findMany({
      where,
      select: WORKFLOW_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.workflow.count({ where }),
  ]);

  const nextCursor =
    workflows.length > 0
      ? workflows[workflows.length - 1]?.id ?? null
      : null;

  return res.success(
    workflows,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/workflows
 *
 * Creates a new workflow for the authenticated organization.
 * Requires at minimum: name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createWorkflowInput.parse(body);

  const workflow = await db.workflow.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      isActive: true,
    },
    select: WORKFLOW_SELECT,
  });

  return res.created(workflow, ctx.rateLimit);
});

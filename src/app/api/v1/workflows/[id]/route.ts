/**
 * REST API v1 single workflow endpoints.
 *
 * - GET /api/v1/workflows/:id — Get workflow with statuses and transitions
 * - PUT /api/v1/workflows/:id — Update a workflow
 *
 * @module api-v1-workflows-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { NotFoundError } from "@/server/lib/errors";

/** Update workflow input schema */
const updateWorkflowInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const WORKFLOW_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  workflowStatuses: {
    include: {
      status: true,
    },
    orderBy: { position: "asc" as const },
  },
  transitions: {
    include: {
      fromStatus: true,
      toStatus: true,
    },
  },
  projects: {
    select: {
      id: true,
      name: true,
      key: true,
    },
  },
} as const;

/**
 * GET /api/v1/workflows/:id
 *
 * Retrieves a single workflow with its statuses, transitions,
 * and project assignments.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Workflow ID is required", undefined, ctx.rateLimit);
  }

  const workflow = await db.workflow.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: WORKFLOW_DETAIL_SELECT,
  });

  if (!workflow) {
    throw new NotFoundError("Workflow", id);
  }

  return res.success(workflow, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/workflows/:id
 *
 * Updates an existing workflow. Accepts partial updates for
 * name, description, isDefault, and isActive.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Workflow ID is required", undefined, ctx.rateLimit);
  }

  const existing = await db.workflow.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });

  if (!existing) {
    throw new NotFoundError("Workflow", id);
  }

  const body = await request.json();
  const input = updateWorkflowInput.parse(body);

  const workflow = await db.workflow.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.isDefault !== undefined
        ? { isDefault: input.isDefault }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: WORKFLOW_DETAIL_SELECT,
  });

  return res.success(workflow, { requestId: ctx.requestId }, ctx.rateLimit);
});

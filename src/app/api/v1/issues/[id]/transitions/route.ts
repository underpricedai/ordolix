/**
 * REST API v1 issue transitions endpoints.
 *
 * - GET /api/v1/issues/:id/transitions — List available transitions
 * - POST /api/v1/issues/:id/transitions — Execute a transition
 *
 * @module api-v1-issues-transitions
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import * as workflowEngine from "@/modules/workflows/server/workflow-engine";

/** Schema for executing a transition */
const executeTransitionInput = z.object({
  transitionId: z.string().min(1),
});

/**
 * GET /api/v1/issues/:id/transitions
 *
 * Returns the list of available workflow transitions for the given issue,
 * based on its current status and the project's active workflow.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id: issueId } = params;

  if (!issueId) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  const transitions = await workflowEngine.getAvailableTransitions(
    db,
    ctx.organizationId,
    issueId,
  );

  return res.success(
    transitions,
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/issues/:id/transitions
 *
 * Executes a workflow transition on the given issue. The request body
 * must include a transitionId from the list of available transitions.
 * Validates that the transition is valid from the issue's current status,
 * runs any configured validators, and updates the issue's status.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id: issueId } = params;

  if (!issueId) {
    return res.badRequest("Issue ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const { transitionId } = executeTransitionInput.parse(body);

  const issue = await workflowEngine.transitionIssue(
    db,
    ctx.organizationId,
    ctx.userId,
    issueId,
    transitionId,
  );

  return res.success(
    issue,
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

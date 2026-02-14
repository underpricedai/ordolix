/**
 * REST API v1 single project endpoint.
 *
 * - GET /api/v1/projects/:key — Get a project by its key
 *
 * @module api-v1-projects-key
 */

import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { NotFoundError } from "@/server/lib/errors";

const PROJECT_SELECT = {
  id: true,
  name: true,
  key: true,
  description: true,
  lead: true,
  avatar: true,
  projectType: true,
  templateKey: true,
  issueCounter: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/projects/:key
 *
 * Returns a single project by its unique key (e.g., "PROJ").
 * The project must belong to the authenticated organization.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { key } = params;

  if (!key) {
    return res.badRequest("Project key is required", undefined, ctx.rateLimit);
  }

  const project = await db.project.findFirst({
    where: {
      key: key.toUpperCase(),
      organizationId: ctx.organizationId,
    },
    select: PROJECT_SELECT,
  });

  if (!project) {
    throw new NotFoundError("Project", key);
  }

  return res.success(project, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * REST API v1 projects collection endpoint.
 *
 * - GET /api/v1/projects — List all projects for the authenticated organization
 *
 * @module api-v1-projects
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing projects */
const listProjectsQuery = z.object({
  search: z.string().optional(),
  includeArchived: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

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
 * GET /api/v1/projects
 *
 * Returns a paginated list of projects for the authenticated organization.
 * Archived projects are excluded by default unless includeArchived=true.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listProjectsQuery.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    ...(!input.includeArchived ? { isArchived: false } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { key: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      select: PROJECT_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.project.count({ where }),
  ]);

  const nextCursor =
    projects.length > 0
      ? projects[projects.length - 1]?.id ?? null
      : null;

  return res.success(
    projects,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

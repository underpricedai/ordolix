/**
 * REST API v1 search endpoint.
 *
 * - GET /api/v1/search — Search issues using AQL (Ordolix Query Language)
 *
 * @module api-v1-search
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { parseAQL } from "@/shared/aql";

/** Query parameters for search */
const searchQuerySchema = z.object({
  q: z.string().min(1, "Query parameter 'q' is required"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /api/v1/search
 *
 * Searches issues for the authenticated organization using AQL.
 * The 'q' parameter accepts an AQL query string that is parsed into
 * Prisma-compatible where/orderBy clauses.
 *
 * @example
 * GET /api/v1/search?q=status = "Open" AND assignee = "john" ORDER BY created DESC
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = searchQuerySchema.parse(rawParams);

  // Parse the AQL query into Prisma where/orderBy clauses
  let prismaQuery: { where: Record<string, unknown>; orderBy: Record<string, unknown>[] | undefined };
  try {
    prismaQuery = parseAQL(input.q);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid AQL query";
    return res.badRequest(message, { query: input.q }, ctx.rateLimit);
  }

  const where = {
    organizationId: ctx.organizationId,
    deletedAt: null,
    ...prismaQuery.where,
  };

  const [issues, total] = await Promise.all([
    db.issue.findMany({
      where,
      orderBy: prismaQuery.orderBy ?? [{ createdAt: "desc" }],
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
      include: {
        project: { select: { id: true, key: true, name: true } },
        status: { select: { id: true, name: true, color: true } },
        issueType: { select: { id: true, name: true, icon: true } },
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    db.issue.count({ where }),
  ]);

  const nextCursor =
    issues.length > 0 ? issues[issues.length - 1]?.id ?? null : null;

  return res.success(
    issues,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

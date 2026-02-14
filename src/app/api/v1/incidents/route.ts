/**
 * REST API v1 incidents collection endpoints.
 *
 * - GET /api/v1/incidents — List incidents
 * - POST /api/v1/incidents — Create a new incident
 *
 * @module api-v1-incidents
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing incidents */
const listQuerySchema = z.object({
  severity: z.string().optional(),
  resolved: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "true";
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating an incident */
const createIncidentInput = z.object({
  issueId: z.string().min(1),
  severity: z.string().min(1),
  timeline: z.array(z.record(z.string(), z.unknown())).default([]),
  communications: z.array(z.record(z.string(), z.unknown())).default([]),
  statusPageUpdate: z.string().optional(),
});

const INCIDENT_SELECT = {
  id: true,
  issueId: true,
  severity: true,
  timeline: true,
  communications: true,
  statusPageUpdate: true,
  startedAt: true,
  resolvedAt: true,
  createdAt: true,
  issue: {
    select: {
      id: true,
      key: true,
      summary: true,
    },
  },
} as const;

/**
 * GET /api/v1/incidents
 *
 * Lists incidents for the authenticated organization.
 * Supports filtering by severity and resolved status.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const resolvedFilter =
    input.resolved === true
      ? { resolvedAt: { not: null } }
      : input.resolved === false
        ? { resolvedAt: null }
        : {};

  const where = {
    organizationId: ctx.organizationId,
    ...(input.severity ? { severity: input.severity } : {}),
    ...resolvedFilter,
  };

  const [incidents, total] = await Promise.all([
    db.incident.findMany({
      where,
      select: INCIDENT_SELECT,
      orderBy: { startedAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.incident.count({ where }),
  ]);

  const nextCursor =
    incidents.length > 0
      ? incidents[incidents.length - 1]?.id ?? null
      : null;

  return res.success(
    incidents,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/incidents
 *
 * Creates a new incident for the authenticated organization.
 * Requires: issueId and severity.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createIncidentInput.parse(body);

  const incident = await db.incident.create({
    data: {
      organizationId: ctx.organizationId,
      issueId: input.issueId,
      severity: input.severity,
      timeline: input.timeline as unknown as Prisma.InputJsonValue,
      communications: input.communications as unknown as Prisma.InputJsonValue,
      statusPageUpdate: input.statusPageUpdate,
    },
    select: INCIDENT_SELECT,
  });

  return res.created(incident, ctx.rateLimit);
});

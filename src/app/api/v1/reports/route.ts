/**
 * REST API v1 reports collection endpoints.
 *
 * - GET /api/v1/reports — List saved reports
 * - POST /api/v1/reports — Create a new saved report
 *
 * @module api-v1-reports
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing reports */
const listQuerySchema = z.object({
  reportType: z.string().optional(),
  isShared: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a report */
const createReportInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  reportType: z.string().default("custom"),
  query: z.record(z.string(), z.unknown()).default({}),
  dimensions: z.array(z.record(z.string(), z.unknown())).default([]),
  measures: z.array(z.record(z.string(), z.unknown())).default([]),
  chartType: z.string().default("bar"),
  filters: z.record(z.string(), z.unknown()).default({}),
  visualization: z.record(z.string(), z.unknown()).optional(),
  isShared: z.boolean().default(false),
  schedule: z.record(z.string(), z.unknown()).optional(),
  recipients: z.array(z.string()).default([]),
});

const REPORT_SELECT = {
  id: true,
  name: true,
  description: true,
  reportType: true,
  query: true,
  dimensions: true,
  measures: true,
  chartType: true,
  filters: true,
  visualization: true,
  isShared: true,
  schedule: true,
  recipients: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/reports
 *
 * Lists saved reports for the authenticated organization.
 * Supports filtering by report type and shared status.
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
    ...(input.reportType ? { reportType: input.reportType } : {}),
    ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
  };

  const [reports, total] = await Promise.all([
    db.savedReport.findMany({
      where,
      select: REPORT_SELECT,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.savedReport.count({ where }),
  ]);

  const nextCursor =
    reports.length > 0 ? reports[reports.length - 1]?.id ?? null : null;

  return res.success(
    reports,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/reports
 *
 * Creates a new saved report for the authenticated organization.
 * Requires at minimum: name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createReportInput.parse(body);

  const report = await db.savedReport.create({
    data: {
      organizationId: ctx.organizationId,
      createdBy: ctx.userId,
      name: input.name,
      description: input.description,
      reportType: input.reportType,
      query: input.query as unknown as Prisma.InputJsonValue,
      dimensions: input.dimensions as unknown as Prisma.InputJsonValue,
      measures: input.measures as unknown as Prisma.InputJsonValue,
      chartType: input.chartType,
      filters: input.filters as unknown as Prisma.InputJsonValue,
      visualization: input.visualization as unknown as Prisma.InputJsonValue | undefined,
      isShared: input.isShared,
      schedule: input.schedule as unknown as Prisma.InputJsonValue | undefined,
      recipients: input.recipients as unknown as Prisma.InputJsonValue,
    },
    select: REPORT_SELECT,
  });

  return res.created(report, ctx.rateLimit);
});

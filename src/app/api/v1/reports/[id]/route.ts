/**
 * REST API v1 single report endpoints.
 *
 * - GET /api/v1/reports/:id — Get report by ID
 * - PUT /api/v1/reports/:id — Update a report
 * - DELETE /api/v1/reports/:id — Delete a report
 *
 * @module api-v1-reports-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { type Prisma } from "@prisma/client";

/** Input schema for updating a report */
const updateReportInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  reportType: z.string().optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
  measures: z.array(z.record(z.string(), z.unknown())).optional(),
  chartType: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  visualization: z.record(z.string(), z.unknown()).optional(),
  isShared: z.boolean().optional(),
  schedule: z.record(z.string(), z.unknown()).optional(),
  recipients: z.array(z.string()).optional(),
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
 * GET /api/v1/reports/:id
 *
 * Retrieves a single saved report by ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Report ID is required", undefined, ctx.rateLimit);
  }

  const report = await db.savedReport.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: REPORT_SELECT,
  });

  if (!report) {
    return res.notFound("Report", id, ctx.rateLimit);
  }

  return res.success(report, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/reports/:id
 *
 * Updates an existing saved report. Accepts partial updates.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Report ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateReportInput.parse(body);

  // Verify the report exists and belongs to this organization
  const existing = await db.savedReport.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Report", id, ctx.rateLimit);
  }

  const data: Prisma.SavedReportUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.reportType !== undefined) data.reportType = input.reportType;
  if (input.query !== undefined) data.query = input.query as unknown as Prisma.InputJsonValue;
  if (input.dimensions !== undefined) data.dimensions = input.dimensions as unknown as Prisma.InputJsonValue;
  if (input.measures !== undefined) data.measures = input.measures as unknown as Prisma.InputJsonValue;
  if (input.chartType !== undefined) data.chartType = input.chartType;
  if (input.filters !== undefined) data.filters = input.filters as unknown as Prisma.InputJsonValue;
  if (input.visualization !== undefined) data.visualization = input.visualization as unknown as Prisma.InputJsonValue;
  if (input.isShared !== undefined) data.isShared = input.isShared;
  if (input.schedule !== undefined) data.schedule = input.schedule as unknown as Prisma.InputJsonValue;
  if (input.recipients !== undefined) data.recipients = input.recipients as unknown as Prisma.InputJsonValue;

  const report = await db.savedReport.update({
    where: { id },
    data,
    select: REPORT_SELECT,
  });

  return res.success(report, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/reports/:id
 *
 * Permanently deletes a saved report.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Report ID is required", undefined, ctx.rateLimit);
  }

  // Verify the report exists and belongs to this organization
  const existing = await db.savedReport.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Report", id, ctx.rateLimit);
  }

  await db.savedReport.delete({ where: { id } });

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

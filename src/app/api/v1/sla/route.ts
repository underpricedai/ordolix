/**
 * REST API v1 SLA configuration endpoints.
 *
 * - GET /api/v1/sla — List SLA configurations
 * - POST /api/v1/sla — Create a new SLA configuration
 *
 * @module api-v1-sla
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing SLA configs */
const listQuerySchema = z.object({
  projectId: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating an SLA config */
const createSLAConfigInput = z.object({
  name: z.string().min(1).max(255),
  projectId: z.string().optional(),
  metric: z.string().min(1),
  targetDuration: z.number().int().positive(),
  startCondition: z.record(z.string(), z.unknown()),
  stopCondition: z.record(z.string(), z.unknown()),
  pauseConditions: z.array(z.record(z.string(), z.unknown())).default([]),
  calendar: z.record(z.string(), z.unknown()).default({}),
  escalationRules: z.array(z.record(z.string(), z.unknown())).default([]),
  isActive: z.boolean().default(true),
});

const SLA_CONFIG_SELECT = {
  id: true,
  name: true,
  projectId: true,
  metric: true,
  targetDuration: true,
  startCondition: true,
  stopCondition: true,
  pauseConditions: true,
  calendar: true,
  escalationRules: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      instances: true,
    },
  },
} as const;

/**
 * GET /api/v1/sla
 *
 * Lists SLA configurations for the authenticated organization.
 * By default returns only active configurations unless isActive=false.
 * Optionally filtered by projectId. Pagination is cursor-based.
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
    isActive: input.isActive,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };

  const [configs, total] = await Promise.all([
    db.sLAConfig.findMany({
      where,
      select: SLA_CONFIG_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.sLAConfig.count({ where }),
  ]);

  const nextCursor =
    configs.length > 0 ? configs[configs.length - 1]?.id ?? null : null;

  return res.success(
    configs,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/sla
 *
 * Creates a new SLA configuration for the authenticated organization.
 * Requires: name, metric, targetDuration, startCondition, stopCondition.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createSLAConfigInput.parse(body);

  const config = await db.sLAConfig.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      projectId: input.projectId,
      metric: input.metric,
      targetDuration: input.targetDuration,
      startCondition: input.startCondition as unknown as Prisma.InputJsonValue,
      stopCondition: input.stopCondition as unknown as Prisma.InputJsonValue,
      pauseConditions: input.pauseConditions as unknown as Prisma.InputJsonValue,
      calendar: input.calendar as unknown as Prisma.InputJsonValue,
      escalationRules: input.escalationRules as unknown as Prisma.InputJsonValue,
      isActive: input.isActive,
    },
    select: SLA_CONFIG_SELECT,
  });

  return res.created(config, ctx.rateLimit);
});

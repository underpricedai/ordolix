/**
 * REST API v1 automation rules collection endpoints.
 *
 * - GET /api/v1/automation — List automation rules
 * - POST /api/v1/automation — Create an automation rule
 *
 * @module api-v1-automation
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { type Prisma } from "@prisma/client";

/** Query parameters for listing automation rules */
const listQuerySchema = z.object({
  projectId: z.string().optional(),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "true";
    }),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating an automation rule */
const createAutomationInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  projectId: z.string().optional(),
  trigger: z.record(z.string(), z.unknown()),
  conditions: z.array(z.record(z.string(), z.unknown())).default([]),
  actions: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean().default(true),
});

const AUTOMATION_RULE_SELECT = {
  id: true,
  name: true,
  description: true,
  projectId: true,
  trigger: true,
  conditions: true,
  actions: true,
  priority: true,
  enabled: true,
  executionCount: true,
  lastExecutedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/v1/automation
 *
 * Lists automation rules for the authenticated organization.
 * Supports filtering by projectId, enabled status, and search text.
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
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [rules, total] = await Promise.all([
    db.automationRule.findMany({
      where,
      select: AUTOMATION_RULE_SELECT,
      orderBy: { priority: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.automationRule.count({ where }),
  ]);

  const nextCursor =
    rules.length > 0
      ? rules[rules.length - 1]?.id ?? null
      : null;

  return res.success(
    rules,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/automation
 *
 * Creates a new automation rule for the authenticated organization.
 * Requires: name, trigger, and actions.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createAutomationInput.parse(body);

  const rule = await db.automationRule.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      trigger: input.trigger as unknown as Prisma.InputJsonValue,
      conditions: input.conditions as unknown as Prisma.InputJsonValue,
      actions: input.actions as unknown as Prisma.InputJsonValue,
      enabled: input.isEnabled,
    },
    select: AUTOMATION_RULE_SELECT,
  });

  return res.created(rule, ctx.rateLimit);
});

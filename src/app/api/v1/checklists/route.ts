/**
 * REST API v1 checklists collection endpoints.
 *
 * - GET /api/v1/checklists — List checklists for an issue
 * - POST /api/v1/checklists — Create a checklist with items
 *
 * @module api-v1-checklists
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing checklists */
const listQuerySchema = z.object({
  issueId: z.string().min(1),
});

/** Schema for a checklist item */
const checklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  isChecked: z.boolean().default(false),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  position: z.number().int().min(0).optional(),
});

/** Input schema for creating a checklist */
const createChecklistInput = z.object({
  issueId: z.string().min(1),
  title: z.string().min(1).max(255).default("Checklist"),
  items: z.array(checklistItemSchema).default([]),
});

const CHECKLIST_SELECT = {
  id: true,
  issueId: true,
  title: true,
  position: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      text: true,
      isChecked: true,
      assigneeId: true,
      dueDate: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { position: "asc" as const },
  },
} as const;

/**
 * GET /api/v1/checklists
 *
 * Lists checklists for a given issue, including their items.
 * Requires issueId query parameter.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const checklists = await db.checklist.findMany({
    where: {
      organizationId: ctx.organizationId,
      issueId: input.issueId,
    },
    select: CHECKLIST_SELECT,
    orderBy: { position: "asc" },
  });

  return res.success(
    checklists,
    { total: checklists.length, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/checklists
 *
 * Creates a new checklist on an issue, optionally with initial items.
 * Each item gets an auto-assigned position if not provided.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createChecklistInput.parse(body);

  const checklist = await db.checklist.create({
    data: {
      organizationId: ctx.organizationId,
      issueId: input.issueId,
      title: input.title,
      items: {
        create: input.items.map((item, index) => ({
          text: item.text,
          isChecked: item.isChecked,
          assigneeId: item.assigneeId,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          position: item.position ?? index,
        })),
      },
    },
    select: CHECKLIST_SELECT,
  });

  return res.created(checklist, ctx.rateLimit);
});

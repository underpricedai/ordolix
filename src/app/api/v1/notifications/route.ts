/**
 * REST API v1 notifications endpoints.
 *
 * - GET /api/v1/notifications — List user notifications
 *
 * @module api-v1-notifications
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing notifications */
const listQuerySchema = z.object({
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  channel: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const NOTIFICATION_SELECT = {
  id: true,
  event: true,
  issueId: true,
  channel: true,
  title: true,
  body: true,
  metadata: true,
  isRead: true,
  sentAt: true,
  readAt: true,
  issue: {
    select: {
      id: true,
      key: true,
      summary: true,
    },
  },
} as const;

/**
 * GET /api/v1/notifications
 *
 * Lists notifications for the authenticated user within their organization.
 * Supports filtering by read status and channel.
 * Pagination is cursor-based. Results are ordered by sentAt descending (newest first).
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
    userId: ctx.userId,
    ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
    ...(input.channel ? { channel: input.channel } : {}),
  };

  const [notifications, total] = await Promise.all([
    db.notificationRecord.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: { sentAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.notificationRecord.count({ where }),
  ]);

  const nextCursor =
    notifications.length > 0
      ? notifications[notifications.length - 1]?.id ?? null
      : null;

  return res.success(
    notifications,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

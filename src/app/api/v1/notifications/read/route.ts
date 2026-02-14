/**
 * REST API v1 notification read endpoint.
 *
 * - PUT /api/v1/notifications/read — Mark notifications as read
 *
 * @module api-v1-notifications-read
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";

/** Input schema for marking notifications as read */
const markReadInput = z.object({
  /** Specific notification IDs to mark as read. If omitted, marks all as read. */
  ids: z.array(z.string().min(1)).optional(),
});

/**
 * PUT /api/v1/notifications/read
 *
 * Marks notifications as read for the authenticated user.
 * If 'ids' is provided, only those notifications are marked read.
 * If 'ids' is omitted, all unread notifications for the user are marked read.
 */
export const PUT = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = markReadInput.parse(body);

  const now = new Date();

  const where = {
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    isRead: false,
    ...(input.ids ? { id: { in: input.ids } } : {}),
  };

  const result = await db.notificationRecord.updateMany({
    where,
    data: {
      isRead: true,
      readAt: now,
    },
  });

  return res.success(
    { updatedCount: result.count },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

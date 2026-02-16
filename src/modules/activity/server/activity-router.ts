/**
 * tRPC router for the activity feed module.
 *
 * @description Exposes a read-only endpoint for listing recent audit log
 * entries. Available to all authenticated users (protectedProcedure),
 * not restricted to admins.
 *
 * @module activity-router
 */
import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import * as activityService from "./activity-service";

export const activityRouter = createRouter({
  list: protectedProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return activityService.listActivity(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),
});

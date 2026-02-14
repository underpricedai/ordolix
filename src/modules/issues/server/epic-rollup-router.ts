/**
 * Epic Rollup tRPC Router
 *
 * Exposes the Epic Sum Up (story point rollup) feature via tRPC,
 * providing aggregated child issue metrics for epics.
 *
 * @module epic-rollup-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import * as epicRollup from "./epic-rollup";

export const epicRollupRouter = createRouter({
  /**
   * Get aggregated rollup metrics for an epic's children.
   *
   * @param issueId - The parent issue ID to aggregate children for
   * @returns Aggregated story points, time estimates, and progress
   */
  getRollup: protectedProcedure
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return epicRollup.getRollup(ctx.db, ctx.organizationId, input.issueId);
    }),
});

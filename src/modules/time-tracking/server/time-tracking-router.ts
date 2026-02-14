import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  logTimeInput,
  updateTimeLogInput,
  listTimeLogsInput,
  deleteTimeLogInput,
} from "../types/schemas";
import * as timeTrackingService from "./time-tracking-service";

export const timeTrackingRouter = createRouter({
  log: protectedProcedure
    .input(logTimeInput)
    .mutation(async ({ ctx, input }) => {
      return timeTrackingService.logTime(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return timeTrackingService.getTimeLog(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  list: protectedProcedure
    .input(listTimeLogsInput)
    .query(async ({ ctx, input }) => {
      return timeTrackingService.listTimeLogs(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateTimeLogInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return timeTrackingService.updateTimeLog(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(deleteTimeLogInput)
    .mutation(async ({ ctx, input }) => {
      return timeTrackingService.deleteTimeLog(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  issueTotalTime: protectedProcedure
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return timeTrackingService.getIssueTotalTime(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),
});

import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  logTimeInput,
  updateTimeLogInput,
  listTimeLogsInput,
  deleteTimeLogInput,
  getTimesheetInput,
  submitTimesheetInput,
  approveTimesheetInput,
  rejectTimesheetInput,
  listPendingTimesheetsInput,
  myLoggedHoursInput,
  teamLoggedHoursInput,
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

  // ── Timesheet Approval ─────────────────────────────────────────────────

  getOrCreateTimesheet: protectedProcedure
    .input(getTimesheetInput)
    .query(async ({ ctx, input }) => {
      return timeTrackingService.getOrCreateTimesheet(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  submitTimesheet: protectedProcedure
    .input(submitTimesheetInput)
    .mutation(async ({ ctx, input }) => {
      return timeTrackingService.submitTimesheet(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  approveTimesheet: protectedProcedure
    .input(approveTimesheetInput)
    .mutation(async ({ ctx, input }) => {
      return timeTrackingService.approveTimesheet(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  rejectTimesheet: protectedProcedure
    .input(rejectTimesheetInput)
    .mutation(async ({ ctx, input }) => {
      return timeTrackingService.rejectTimesheet(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  listPendingTimesheets: protectedProcedure
    .input(listPendingTimesheetsInput)
    .query(async ({ ctx, input }) => {
      return timeTrackingService.listPendingTimesheets(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  // ── Time Reports ───────────────────────────────────────────────────────

  myLoggedHours: protectedProcedure
    .input(myLoggedHoursInput)
    .query(async ({ ctx, input }) => {
      return timeTrackingService.myLoggedHours(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  teamLoggedHours: protectedProcedure
    .input(teamLoggedHoursInput)
    .query(async ({ ctx, input }) => {
      return timeTrackingService.teamLoggedHours(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),
});

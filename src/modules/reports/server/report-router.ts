import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createReportInput,
  updateReportInput,
  listReportsInput,
  runReportInput,
} from "../types/schemas";
import * as reportService from "./report-service";

export const reportRouter = createRouter({
  create: protectedProcedure
    .input(createReportInput)
    .mutation(async ({ ctx, input }) => {
      return reportService.createReport(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return reportService.getReport(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  list: protectedProcedure
    .input(listReportsInput)
    .query(async ({ ctx, input }) => {
      return reportService.listReports(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateReportInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return reportService.updateReport(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        id,
        data,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return reportService.deleteReport(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  run: protectedProcedure
    .input(runReportInput)
    .query(async ({ ctx, input }) => {
      return reportService.runReport(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),
});

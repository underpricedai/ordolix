import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createDashboardInput,
  updateDashboardInput,
  addWidgetInput,
  updateWidgetInput,
  deleteWidgetInput,
} from "../types/schemas";
import * as dashboardService from "./dashboard-service";

export const dashboardRouter = createRouter({
  create: protectedProcedure
    .input(createDashboardInput)
    .mutation(async ({ ctx, input }) => {
      return dashboardService.createDashboard(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return dashboardService.getDashboard(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return dashboardService.listDashboards(
      ctx.db,
      ctx.organizationId,
      ctx.session.user!.id!,
    );
  }),

  update: protectedProcedure
    .input(updateDashboardInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return dashboardService.updateDashboard(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return dashboardService.deleteDashboard(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  addWidget: protectedProcedure
    .input(addWidgetInput)
    .mutation(async ({ ctx, input }) => {
      return dashboardService.addWidget(ctx.db, ctx.organizationId, input);
    }),

  updateWidget: protectedProcedure
    .input(updateWidgetInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return dashboardService.updateWidget(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  deleteWidget: protectedProcedure
    .input(deleteWidgetInput)
    .mutation(async ({ ctx, input }) => {
      return dashboardService.deleteWidget(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),
});

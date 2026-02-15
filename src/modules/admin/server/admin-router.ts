/**
 * tRPC router for admin module.
 *
 * @description Exposes procedures for admin dashboard stats, audit log queries,
 * webhook CRUD operations, and system health checks. All procedures require
 * authentication and organization context.
 *
 * @module admin-router
 */
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  getDashboardStatsInput,
  listAuditLogInput,
  listWebhooksInput,
  createWebhookInput,
  updateWebhookInput,
  deleteWebhookInput,
  systemHealthInput,
} from "../types/schemas";
import * as adminService from "./admin-service";

export const adminRouter = createRouter({
  getDashboardStats: protectedProcedure
    .input(getDashboardStatsInput)
    .query(async ({ ctx }) => {
      return adminService.getDashboardStats(ctx.db, ctx.organizationId);
    }),

  listAuditLog: protectedProcedure
    .input(listAuditLogInput)
    .query(async ({ ctx, input }) => {
      return adminService.listAuditLog(ctx.db, ctx.organizationId, input);
    }),

  listWebhooks: protectedProcedure
    .input(listWebhooksInput)
    .query(async ({ ctx, input }) => {
      return adminService.listWebhooks(ctx.db, ctx.organizationId, input);
    }),

  createWebhook: protectedProcedure
    .input(createWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.createWebhook(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  updateWebhook: protectedProcedure
    .input(updateWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.updateWebhook(ctx.db, ctx.organizationId, input);
    }),

  deleteWebhook: protectedProcedure
    .input(deleteWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.deleteWebhook(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  getSystemHealth: protectedProcedure
    .input(systemHealthInput)
    .query(async ({ ctx }) => {
      return adminService.getSystemHealth(ctx.db, ctx.organizationId);
    }),
});

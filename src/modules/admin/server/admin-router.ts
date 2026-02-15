/**
 * tRPC router for admin module.
 *
 * @description Exposes procedures for admin dashboard stats, audit log queries,
 * webhook CRUD operations, and system health checks. All procedures require
 * authentication and organization context.
 *
 * @module admin-router
 */
import { createRouter, adminProcedure } from "@/server/trpc/init";
import {
  getDashboardStatsInput,
  listAuditLogInput,
  listWebhooksInput,
  createWebhookInput,
  updateWebhookInput,
  deleteWebhookInput,
  systemHealthInput,
  createPriorityInput,
  updatePriorityInput,
  deletePriorityInput,
  reorderPrioritiesInput,
  createIssueTypeInput,
  updateIssueTypeInput,
  deleteIssueTypeInput,
} from "../types/schemas";
import * as adminService from "./admin-service";
import * as priorityService from "./priority-service";
import * as issueTypeService from "./issue-type-service";

export const adminRouter = createRouter({
  getDashboardStats: adminProcedure
    .input(getDashboardStatsInput)
    .query(async ({ ctx }) => {
      return adminService.getDashboardStats(ctx.db, ctx.organizationId);
    }),

  listAuditLog: adminProcedure
    .input(listAuditLogInput)
    .query(async ({ ctx, input }) => {
      return adminService.listAuditLog(ctx.db, ctx.organizationId, input);
    }),

  listWebhooks: adminProcedure
    .input(listWebhooksInput)
    .query(async ({ ctx, input }) => {
      return adminService.listWebhooks(ctx.db, ctx.organizationId, input);
    }),

  createWebhook: adminProcedure
    .input(createWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.createWebhook(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  updateWebhook: adminProcedure
    .input(updateWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.updateWebhook(ctx.db, ctx.organizationId, input);
    }),

  deleteWebhook: adminProcedure
    .input(deleteWebhookInput)
    .mutation(async ({ ctx, input }) => {
      return adminService.deleteWebhook(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  getSystemHealth: adminProcedure
    .input(systemHealthInput)
    .query(async ({ ctx }) => {
      return adminService.getSystemHealth(ctx.db, ctx.organizationId);
    }),

  // ── Priority Procedures ──────────────────────────────────────────────────

  listPriorities: adminProcedure
    .query(async ({ ctx }) => {
      return priorityService.listPriorities(ctx.db, ctx.organizationId);
    }),

  createPriority: adminProcedure
    .input(createPriorityInput)
    .mutation(async ({ ctx, input }) => {
      return priorityService.createPriority(ctx.db, ctx.organizationId, input);
    }),

  updatePriority: adminProcedure
    .input(updatePriorityInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return priorityService.updatePriority(ctx.db, ctx.organizationId, id, updates);
    }),

  deletePriority: adminProcedure
    .input(deletePriorityInput)
    .mutation(async ({ ctx, input }) => {
      return priorityService.deletePriority(ctx.db, ctx.organizationId, input.id);
    }),

  reorderPriorities: adminProcedure
    .input(reorderPrioritiesInput)
    .mutation(async ({ ctx, input }) => {
      return priorityService.reorderPriorities(ctx.db, ctx.organizationId, input.orderedIds);
    }),

  // ── Issue Type Procedures ────────────────────────────────────────────────

  listIssueTypes: adminProcedure
    .query(async ({ ctx }) => {
      return issueTypeService.listIssueTypes(ctx.db, ctx.organizationId);
    }),

  createIssueType: adminProcedure
    .input(createIssueTypeInput)
    .mutation(async ({ ctx, input }) => {
      return issueTypeService.createIssueType(ctx.db, ctx.organizationId, input);
    }),

  updateIssueType: adminProcedure
    .input(updateIssueTypeInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return issueTypeService.updateIssueType(ctx.db, ctx.organizationId, id, updates);
    }),

  deleteIssueType: adminProcedure
    .input(deleteIssueTypeInput)
    .mutation(async ({ ctx, input }) => {
      return issueTypeService.deleteIssueType(ctx.db, ctx.organizationId, input.id);
    }),
});

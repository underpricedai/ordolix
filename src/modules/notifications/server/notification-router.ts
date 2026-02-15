import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import {
  createNotificationInput,
  listNotificationsInput,
  markReadInput,
  markAllReadInput,
  updatePreferenceInput,
  listPreferencesInput,
  createNotificationSchemeInput,
  updateNotificationSchemeInput,
  addNotificationSchemeEntryInput,
  removeNotificationSchemeEntryInput,
  assignNotificationSchemeInput,
} from "../types/schemas";
import * as notificationService from "./notification-service";
import * as notificationSchemeService from "./notification-scheme-service";

export const notificationRouter = createRouter({
  create: protectedProcedure
    .input(createNotificationInput)
    .mutation(async ({ ctx, input }) => {
      return notificationService.createNotification(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  list: protectedProcedure
    .input(listNotificationsInput)
    .query(async ({ ctx, input }) => {
      return notificationService.listNotifications(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  markRead: protectedProcedure
    .input(markReadInput)
    .mutation(async ({ ctx, input }) => {
      return notificationService.markRead(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  markAllRead: protectedProcedure
    .input(markAllReadInput)
    .mutation(async ({ ctx }) => {
      return notificationService.markAllRead(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
      );
    }),

  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      return notificationService.getUnreadCount(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
      );
    }),

  updatePreference: protectedProcedure
    .input(updatePreferenceInput)
    .mutation(async ({ ctx, input }) => {
      return notificationService.updatePreference(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  listPreferences: protectedProcedure
    .input(listPreferencesInput)
    .query(async ({ ctx }) => {
      return notificationService.listPreferences(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return notificationService.deleteNotification(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  // ── Notification Scheme Procedures ──────────────────────────────────────

  listSchemes: adminProcedure
    .query(async ({ ctx }) => {
      return notificationSchemeService.listNotificationSchemes(ctx.db, ctx.organizationId);
    }),

  getScheme: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return notificationSchemeService.getNotificationScheme(ctx.db, ctx.organizationId, input.id);
    }),

  createScheme: adminProcedure
    .input(createNotificationSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.createNotificationScheme(ctx.db, ctx.organizationId, input);
    }),

  updateScheme: adminProcedure
    .input(updateNotificationSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.updateNotificationScheme(ctx.db, ctx.organizationId, input);
    }),

  deleteScheme: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.deleteNotificationScheme(ctx.db, ctx.organizationId, input.id);
    }),

  addSchemeEntry: adminProcedure
    .input(addNotificationSchemeEntryInput)
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.addEntry(ctx.db, ctx.organizationId, input);
    }),

  removeSchemeEntry: adminProcedure
    .input(removeNotificationSchemeEntryInput)
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.removeEntry(ctx.db, input.id);
    }),

  assignScheme: adminProcedure
    .input(assignNotificationSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return notificationSchemeService.assignToProject(ctx.db, ctx.organizationId, input.schemeId, input.projectId);
    }),
});

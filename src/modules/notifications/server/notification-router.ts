import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createNotificationInput,
  listNotificationsInput,
  markReadInput,
  markAllReadInput,
  updatePreferenceInput,
  listPreferencesInput,
} from "../types/schemas";
import * as notificationService from "./notification-service";

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
});

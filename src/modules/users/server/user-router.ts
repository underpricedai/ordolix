/**
 * @module users/server/user-router
 * @description tRPC router for the Users module.
 * Exposes procedures for profile management, notification preferences,
 * API token lifecycle, user listing, invitation, role management, and deactivation.
 */

import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  updateProfileInput,
  updateNotificationPrefsInput,
  createApiTokenInput,
  revokeApiTokenInput,
  listApiTokensInput,
  listUsersInput,
  inviteUserInput,
  updateUserRoleInput,
  deactivateUserInput,
} from "../types/schemas";
import * as userService from "./user-service";

export const userRouter = createRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return userService.getProfile(ctx.db, ctx.session.user!.id!);
  }),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      return userService.updateProfile(ctx.db, ctx.session.user!.id!, input);
    }),

  updateNotificationPrefs: protectedProcedure
    .input(updateNotificationPrefsInput)
    .mutation(async ({ ctx, input }) => {
      return userService.updateNotificationPrefs(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  createApiToken: protectedProcedure
    .input(createApiTokenInput)
    .mutation(async ({ ctx, input }) => {
      return userService.createApiToken(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  revokeToken: protectedProcedure
    .input(revokeApiTokenInput)
    .mutation(async ({ ctx, input }) => {
      return userService.revokeToken(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.tokenId,
      );
    }),

  listTokens: protectedProcedure
    .input(listApiTokensInput)
    .query(async ({ ctx }) => {
      return userService.listTokens(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
      );
    }),

  listUsers: protectedProcedure
    .input(listUsersInput)
    .query(async ({ ctx, input }) => {
      return userService.listUsers(ctx.db, ctx.organizationId, input);
    }),

  inviteUser: protectedProcedure
    .input(inviteUserInput)
    .mutation(async ({ ctx, input }) => {
      return userService.inviteUser(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  updateUserRole: protectedProcedure
    .input(updateUserRoleInput)
    .mutation(async ({ ctx, input }) => {
      return userService.updateUserRole(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  deactivateUser: protectedProcedure
    .input(deactivateUserInput)
    .mutation(async ({ ctx, input }) => {
      return userService.deactivateUser(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),
});

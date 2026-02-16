/**
 * Favorite router — tRPC endpoints for bookmarking/favoriting entities.
 *
 * @description Exposes toggle, list, and check procedures for managing user
 * favorites. All procedures require authentication via protectedProcedure.
 */
import { z } from "zod";
import { protectedProcedure, createRouter } from "@/server/trpc/init";
import * as favoriteService from "./favorite-service";

const entityTypeEnum = z.enum(["issue", "project", "board", "dashboard"]);

export const favoriteRouter = createRouter({
  /**
   * Toggle a favorite on or off for the current user.
   *
   * @returns Object with `favorited` boolean indicating new state
   */
  toggle: protectedProcedure
    .input(
      z.object({
        entityType: entityTypeEnum,
        entityId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return favoriteService.toggleFavorite(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
        input.entityType,
        input.entityId,
      );
    }),

  /**
   * List all favorites for the current user, optionally filtered by entity type.
   *
   * @returns Array of favorite records
   */
  list: protectedProcedure
    .input(
      z
        .object({
          entityType: entityTypeEnum.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return favoriteService.listFavorites(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
        input?.entityType,
      );
    }),

  /**
   * Check whether a specific entity is favorited by the current user.
   *
   * @returns Object with `favorited` boolean
   */
  check: protectedProcedure
    .input(
      z.object({
        entityType: z.string().min(1),
        entityId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const favorited = await favoriteService.isFavorited(
        ctx.db,
        ctx.session.user.id!,
        input.entityType,
        input.entityId,
      );
      return { favorited };
    }),
});

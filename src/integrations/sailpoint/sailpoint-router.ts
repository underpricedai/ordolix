/**
 * SailPoint integration tRPC router.
 *
 * Provides admin and protected procedures for managing SailPoint
 * group-to-Ordolix mappings, syncing membership, and viewing logs.
 *
 * @module integrations/sailpoint/sailpoint-router
 */

import { adminProcedure, createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  getIntegrationConfig,
  saveIntegrationConfig,
} from "@/integrations/config";
import * as sailpointService from "./sailpoint-service";
import {
  configureSailPointSchema,
  createMappingSchema,
  deleteMappingSchema,
  syncMappingSchema,
  getSyncLogsSchema,
  listSailPointGroupsSchema,
} from "./schemas";

export const sailpointRouter = createRouter({
  /**
   * Get the current SailPoint configuration (sanitized - no secrets).
   */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await getIntegrationConfig(ctx.db, ctx.organizationId, "sailpoint");
    if (!config) return null;
    return {
      id: config.id,
      isActive: config.isActive,
      tenantUrl: (config.config as Record<string, unknown>)?.tenantUrl ?? null,
      clientId: (config.config as Record<string, unknown>)?.clientId ?? null,
      // clientSecret is intentionally excluded
    };
  }),

  /**
   * Configure SailPoint integration credentials (admin only).
   */
  configureSailPoint: adminProcedure
    .input(configureSailPointSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await saveIntegrationConfig(
        ctx.db,
        ctx.organizationId,
        "sailpoint",
        {
          tenantUrl: input.tenantUrl,
          clientId: input.clientId,
          clientSecret: input.clientSecret,
        },
        undefined,
        undefined,
      );
      return result;
    }),

  /**
   * List available SailPoint groups (mock when not configured).
   */
  listSailPointGroups: protectedProcedure
    .input(listSailPointGroupsSchema.optional())
    .query(async ({ ctx, input }) => {
      return sailpointService.listSailPointGroups(ctx.db, ctx.organizationId, input);
    }),

  /**
   * List all SailPoint-to-Ordolix mappings.
   */
  listMappings: protectedProcedure.query(async ({ ctx }) => {
    return sailpointService.listMappings(ctx.db, ctx.organizationId);
  }),

  /**
   * Create a new SailPoint group mapping (admin only).
   */
  createMapping: adminProcedure
    .input(createMappingSchema)
    .mutation(async ({ ctx, input }) => {
      return sailpointService.createMapping(ctx.db, ctx.organizationId, input);
    }),

  /**
   * Delete a SailPoint group mapping (admin only).
   */
  deleteMapping: adminProcedure
    .input(deleteMappingSchema)
    .mutation(async ({ ctx, input }) => {
      return sailpointService.deleteMapping(ctx.db, ctx.organizationId, input.id);
    }),

  /**
   * Sync a single SailPoint mapping (admin only).
   */
  syncMapping: adminProcedure
    .input(syncMappingSchema)
    .mutation(async ({ ctx, input }) => {
      return sailpointService.syncMapping(ctx.db, ctx.organizationId, input.mappingId);
    }),

  /**
   * Full sync of all SailPoint mappings (admin only).
   */
  syncAll: adminProcedure.mutation(async ({ ctx }) => {
    return sailpointService.syncAll(ctx.db, ctx.organizationId);
  }),

  /**
   * Get paginated sync logs.
   */
  getSyncLogs: protectedProcedure
    .input(getSyncLogsSchema.optional())
    .query(async ({ ctx, input }) => {
      return sailpointService.getSyncLogs(ctx.db, ctx.organizationId, input ?? { limit: 50 });
    }),
});

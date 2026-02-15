/**
 * Omnea integration tRPC router.
 *
 * Provides procedures for configuring the Omnea integration,
 * managing procurement request mappings, triggering syncs, and
 * viewing sync status.
 *
 * @module integrations/omnea/omnea-router
 */

import { createRouter, adminProcedure, protectedProcedure } from "@/server/trpc/init";
import * as omneaService from "./omnea-service";
import {
  configureOmneaInput,
  syncProcurementRequestInput,
  createOmneaMappingInput,
  deleteOmneaMappingInput,
  listOmneaMappingsInput,
  getOmneaMappingInput,
} from "./schemas";

export const omneaRouter = createRouter({
  // ── Admin Procedures ──────────────────────────────────────────────────

  /** Save or update Omnea integration configuration. Admin only. */
  configureOmnea: adminProcedure
    .input(configureOmneaInput)
    .mutation(async ({ ctx, input }) => {
      return omneaService.configureOmnea(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  /** Push a procurement request to Omnea. Admin only. */
  syncProcurementRequest: adminProcedure
    .input(syncProcurementRequestInput)
    .mutation(async ({ ctx, input }) => {
      return omneaService.syncProcurementRequest(
        ctx.db,
        ctx.organizationId,
        input.procurementRequestId,
      );
    }),

  /** Manually link an Omnea request to a local procurement request or license. Admin only. */
  createMapping: adminProcedure
    .input(createOmneaMappingInput)
    .mutation(async ({ ctx, input }) => {
      return omneaService.createOmneaMapping(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  /** Remove an Omnea mapping. Admin only. */
  deleteMapping: adminProcedure
    .input(deleteOmneaMappingInput)
    .mutation(async ({ ctx, input }) => {
      return omneaService.deleteOmneaMapping(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  /** Trigger full sync: pull all pending Omnea requests and update statuses. Admin only. */
  syncAll: adminProcedure
    .mutation(async ({ ctx }) => {
      return omneaService.syncAll(
        ctx.db,
        ctx.organizationId,
      );
    }),

  // ── Protected Procedures ──────────────────────────────────────────────

  /** List Omnea mappings with optional filters. */
  listMappings: protectedProcedure
    .input(listOmneaMappingsInput)
    .query(async ({ ctx, input }) => {
      return omneaService.listOmneaRequests(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  /** Get a single Omnea mapping by ID. */
  getMapping: protectedProcedure
    .input(getOmneaMappingInput)
    .query(async ({ ctx, input }) => {
      return omneaService.getOmneaMapping(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  /** Get sanitized Omnea configuration (no tokens exposed). */
  getOmneaConfig: protectedProcedure
    .query(async ({ ctx }) => {
      return omneaService.getOmneaConfig(
        ctx.db,
        ctx.organizationId,
      );
    }),
});

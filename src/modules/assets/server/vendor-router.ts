/**
 * Vendor tRPC router.
 *
 * @description Provides procedures for CRUD on vendors and vendor contracts.
 * Admin procedures are required for create, update, and delete operations.
 *
 * @module vendor-router
 */

import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import { z } from "zod";
import * as vendorService from "./vendor-service";
import {
  createVendorInput,
  updateVendorInput,
  listVendorsInput,
  createVendorContractInput,
} from "../types/schemas";

export const vendorRouter = createRouter({
  createVendor: adminProcedure
    .input(createVendorInput)
    .mutation(async ({ ctx, input }) => {
      return vendorService.createVendor(ctx.db, ctx.organizationId, input);
    }),

  getVendor: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return vendorService.getVendor(ctx.db, ctx.organizationId, input.id);
    }),

  listVendors: protectedProcedure
    .input(listVendorsInput)
    .query(async ({ ctx, input }) => {
      return vendorService.listVendors(ctx.db, ctx.organizationId, input);
    }),

  updateVendor: adminProcedure
    .input(updateVendorInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return vendorService.updateVendor(ctx.db, ctx.organizationId, id, data);
    }),

  deleteVendor: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return vendorService.deleteVendor(ctx.db, ctx.organizationId, input.id);
    }),

  createVendorContract: adminProcedure
    .input(createVendorContractInput)
    .mutation(async ({ ctx, input }) => {
      const { vendorId, ...data } = input;
      return vendorService.createVendorContract(
        ctx.db,
        ctx.organizationId,
        vendorId,
        data,
      );
    }),

  listVendorContracts: protectedProcedure
    .input(z.object({ vendorId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return vendorService.listVendorContracts(
        ctx.db,
        ctx.organizationId,
        input.vendorId,
      );
    }),
});

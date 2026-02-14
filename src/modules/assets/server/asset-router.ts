import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createAssetTypeInput,
  updateAssetTypeInput,
  createAssetInput,
  updateAssetInput,
  listAssetsInput,
  addRelationshipInput,
  removeRelationshipInput,
} from "../types/schemas";
import { z } from "zod";
import * as assetService from "./asset-service";

export const assetRouter = createRouter({
  createAssetType: protectedProcedure
    .input(createAssetTypeInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.createAssetType(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  listAssetTypes: protectedProcedure
    .query(async ({ ctx }) => {
      return assetService.listAssetTypes(ctx.db, ctx.organizationId);
    }),

  updateAssetType: protectedProcedure
    .input(updateAssetTypeInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return assetService.updateAssetType(
        ctx.db,
        ctx.organizationId,
        id,
        data,
      );
    }),

  deleteAssetType: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return assetService.deleteAssetType(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  createAsset: protectedProcedure
    .input(createAssetInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.createAsset(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  getAsset: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return assetService.getAsset(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listAssets: protectedProcedure
    .input(listAssetsInput)
    .query(async ({ ctx, input }) => {
      return assetService.listAssets(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  updateAsset: protectedProcedure
    .input(updateAssetInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return assetService.updateAsset(
        ctx.db,
        ctx.organizationId,
        id,
        data,
      );
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return assetService.deleteAsset(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  addRelationship: protectedProcedure
    .input(addRelationshipInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.addRelationship(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  removeRelationship: protectedProcedure
    .input(removeRelationshipInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.removeRelationship(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),
});

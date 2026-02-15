import type { Prisma } from "@prisma/client";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  saveViewInput,
  getViewInput,
  listViewsInput,
  updateViewInput,
  deleteViewInput,
  getTreeInput,
} from "../types/schemas";
import * as structureService from "./structure-service";

export const structureRouter = createRouter({
  saveView: protectedProcedure
    .input(saveViewInput)
    .mutation(async ({ ctx, input }) => {
      return structureService.saveView(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        {
          ...input,
          columns: input.columns as unknown as Prisma.InputJsonValue,
        },
      );
    }),

  getView: protectedProcedure
    .input(getViewInput)
    .query(async ({ ctx, input }) => {
      return structureService.getView(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listViews: protectedProcedure
    .input(listViewsInput)
    .query(async ({ ctx, input }) => {
      return structureService.listViews(
        ctx.db,
        ctx.organizationId,
        input.projectId,
      );
    }),

  updateView: protectedProcedure
    .input(updateViewInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return structureService.updateView(
        ctx.db,
        ctx.organizationId,
        id,
        {
          ...updates,
          columns: updates.columns as unknown as Prisma.InputJsonValue,
        },
      );
    }),

  deleteView: protectedProcedure
    .input(deleteViewInput)
    .mutation(async ({ ctx, input }) => {
      return structureService.deleteView(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  getTree: protectedProcedure
    .input(getTreeInput)
    .query(async ({ ctx, input }) => {
      return structureService.getTree(ctx.db, ctx.organizationId, input);
    }),
});

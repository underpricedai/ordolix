import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createChecklistInput,
  updateChecklistInput,
  addChecklistItemInput,
  updateChecklistItemInput,
  getChecklistsInput,
} from "../types/schemas";
import * as checklistService from "./checklist-service";

export const checklistRouter = createRouter({
  create: protectedProcedure
    .input(createChecklistInput)
    .mutation(async ({ ctx, input }) => {
      return checklistService.createChecklist(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  list: protectedProcedure
    .input(getChecklistsInput)
    .query(async ({ ctx, input }) => {
      return checklistService.getChecklists(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  update: protectedProcedure
    .input(updateChecklistInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return checklistService.updateChecklist(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return checklistService.deleteChecklist(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  addItem: protectedProcedure
    .input(addChecklistItemInput)
    .mutation(async ({ ctx, input }) => {
      return checklistService.addItem(ctx.db, ctx.organizationId, input);
    }),

  updateItem: protectedProcedure
    .input(updateChecklistItemInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return checklistService.updateItem(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return checklistService.deleteItem(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),
});

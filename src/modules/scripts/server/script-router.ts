import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createScriptInput,
  updateScriptInput,
  listScriptsInput,
  executeScriptInput,
  listExecutionsInput,
} from "../types/schemas";
import * as scriptService from "./script-service";

export const scriptRouter = createRouter({
  create: protectedProcedure
    .input(createScriptInput)
    .mutation(async ({ ctx, input }) => {
      return scriptService.createScript(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return scriptService.getScript(ctx.db, ctx.organizationId, input.id);
    }),

  list: protectedProcedure
    .input(listScriptsInput)
    .query(async ({ ctx, input }) => {
      return scriptService.listScripts(ctx.db, ctx.organizationId, input);
    }),

  update: protectedProcedure
    .input(updateScriptInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return scriptService.updateScript(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return scriptService.deleteScript(ctx.db, ctx.organizationId, input.id);
    }),

  execute: protectedProcedure
    .input(executeScriptInput)
    .mutation(async ({ ctx, input }) => {
      return scriptService.executeScript(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  listExecutions: protectedProcedure
    .input(listExecutionsInput)
    .query(async ({ ctx, input }) => {
      return scriptService.listExecutions(ctx.db, ctx.organizationId, input);
    }),
});

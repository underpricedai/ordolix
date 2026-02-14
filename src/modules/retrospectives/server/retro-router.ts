import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createRetroInput,
  updateRetroInput,
  listRetrosInput,
  addCardInput,
  updateCardInput,
  voteCardInput,
  deleteCardInput,
} from "../types/schemas";
import * as retroService from "./retro-service";
import { z } from "zod";

export const retroRouter = createRouter({
  create: protectedProcedure
    .input(createRetroInput)
    .mutation(async ({ ctx, input }) => {
      return retroService.createRetro(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return retroService.getRetro(ctx.db, ctx.organizationId, input.id);
    }),

  list: protectedProcedure
    .input(listRetrosInput)
    .query(async ({ ctx, input }) => {
      return retroService.listRetros(ctx.db, ctx.organizationId, input);
    }),

  update: protectedProcedure
    .input(updateRetroInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return retroService.updateRetro(ctx.db, ctx.organizationId, id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return retroService.deleteRetro(ctx.db, ctx.organizationId, input.id);
    }),

  addCard: protectedProcedure
    .input(addCardInput)
    .mutation(async ({ ctx, input }) => {
      return retroService.addCard(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  updateCard: protectedProcedure
    .input(updateCardInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return retroService.updateCard(ctx.db, ctx.organizationId, id, data);
    }),

  voteCard: protectedProcedure
    .input(voteCardInput)
    .mutation(async ({ ctx, input }) => {
      return retroService.voteCard(ctx.db, ctx.organizationId, input.id);
    }),

  deleteCard: protectedProcedure
    .input(deleteCardInput)
    .mutation(async ({ ctx, input }) => {
      return retroService.deleteCard(ctx.db, ctx.organizationId, input.id);
    }),
});

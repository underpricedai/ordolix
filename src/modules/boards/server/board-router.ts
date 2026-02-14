import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createBoardInput,
  updateBoardInput,
  getBoardDataInput,
} from "../types/schemas";
import * as boardService from "./board-service";

export const boardRouter = createRouter({
  create: protectedProcedure
    .input(createBoardInput)
    .mutation(async ({ ctx, input }) => {
      return boardService.createBoard(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return boardService.getBoard(ctx.db, ctx.organizationId, input.id);
    }),

  getData: protectedProcedure
    .input(getBoardDataInput)
    .query(async ({ ctx, input }) => {
      return boardService.getBoardData(ctx.db, ctx.organizationId, input);
    }),

  update: protectedProcedure
    .input(updateBoardInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return boardService.updateBoard(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return boardService.deleteBoard(ctx.db, ctx.organizationId, input.id);
    }),
});

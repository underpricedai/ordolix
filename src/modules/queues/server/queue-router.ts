/**
 * @description tRPC router for the Queue (Service Desk) module.
 * Exposes queue CRUD, issue listing, and assignment procedures.
 */
import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createQueueInput,
  updateQueueInput,
  listQueuesInput,
  getQueueIssuesInput,
  assignFromQueueInput,
} from "../types/schemas";
import * as queueService from "./queue-service";

export const queueRouter = createRouter({
  create: protectedProcedure
    .input(createQueueInput)
    .mutation(async ({ ctx, input }) => {
      return queueService.createQueue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateQueueInput)
    .mutation(async ({ ctx, input }) => {
      return queueService.updateQueue(ctx.db, ctx.organizationId, input);
    }),

  list: protectedProcedure
    .input(listQueuesInput)
    .query(async ({ ctx, input }) => {
      return queueService.listQueues(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return queueService.getQueue(ctx.db, ctx.organizationId, input.id);
    }),

  getIssues: protectedProcedure
    .input(getQueueIssuesInput)
    .query(async ({ ctx, input }) => {
      return queueService.getQueueIssues(ctx.db, ctx.organizationId, input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return queueService.deleteQueue(ctx.db, ctx.organizationId, input.id);
    }),

  assign: protectedProcedure
    .input(assignFromQueueInput)
    .mutation(async ({ ctx, input }) => {
      return queueService.assignFromQueue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
        input,
      );
    }),
});

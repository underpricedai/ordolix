import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createSLAConfigInput,
  updateSLAConfigInput,
  listSLAConfigsInput,
  startSLAInput,
  pauseSLAInput,
  resumeSLAInput,
  completeSLAInput,
  getSLAInstancesInput,
} from "../types/schemas";
import { z } from "zod";
import * as slaService from "./sla-service";

export const slaRouter = createRouter({
  createConfig: protectedProcedure
    .input(createSLAConfigInput)
    .mutation(async ({ ctx, input }) => {
      return slaService.createSLAConfig(ctx.db, ctx.organizationId, input);
    }),

  updateConfig: protectedProcedure
    .input(updateSLAConfigInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return slaService.updateSLAConfig(ctx.db, ctx.organizationId, id, rest);
    }),

  listConfigs: protectedProcedure
    .input(listSLAConfigsInput)
    .query(async ({ ctx, input }) => {
      return slaService.listSLAConfigs(ctx.db, ctx.organizationId, input);
    }),

  getConfig: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return slaService.getSLAConfig(ctx.db, ctx.organizationId, input.id);
    }),

  deleteConfig: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return slaService.deleteSLAConfig(ctx.db, ctx.organizationId, input.id);
    }),

  start: protectedProcedure
    .input(startSLAInput)
    .mutation(async ({ ctx, input }) => {
      return slaService.startSLA(ctx.db, ctx.organizationId, input);
    }),

  pause: protectedProcedure
    .input(pauseSLAInput)
    .mutation(async ({ ctx, input }) => {
      return slaService.pauseSLA(
        ctx.db,
        ctx.organizationId,
        input.instanceId,
      );
    }),

  resume: protectedProcedure
    .input(resumeSLAInput)
    .mutation(async ({ ctx, input }) => {
      return slaService.resumeSLA(
        ctx.db,
        ctx.organizationId,
        input.instanceId,
      );
    }),

  complete: protectedProcedure
    .input(completeSLAInput)
    .mutation(async ({ ctx, input }) => {
      return slaService.completeSLA(
        ctx.db,
        ctx.organizationId,
        input.instanceId,
      );
    }),

  getInstances: protectedProcedure
    .input(getSLAInstancesInput)
    .query(async ({ ctx, input }) => {
      return slaService.getSLAInstances(
        ctx.db,
        ctx.organizationId,
        input.issueId,
        input,
      );
    }),
});

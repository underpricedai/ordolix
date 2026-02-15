/**
 * tRPC router for the plans module.
 * @module plan-router
 */

import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createPlanInput,
  updatePlanInput,
  deletePlanInput,
  getPlanByIdInput,
  addScopeInput,
  removeScopeInput,
  getTimelineInput,
  createScenarioInput,
  updateScenarioInput,
  deleteScenarioInput,
} from "../types/schemas";
import * as planService from "./plan-service";

export const planRouter = createRouter({
  create: protectedProcedure
    .input(createPlanInput)
    .mutation(async ({ ctx, input }) => {
      return planService.createPlan(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(getPlanByIdInput)
    .query(async ({ ctx, input }) => {
      return planService.getPlan(ctx.db, ctx.organizationId, input.id);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return planService.listPlans(ctx.db, ctx.organizationId);
  }),

  update: protectedProcedure
    .input(updatePlanInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return planService.updatePlan(ctx.db, ctx.organizationId, id, updates);
    }),

  delete: protectedProcedure
    .input(deletePlanInput)
    .mutation(async ({ ctx, input }) => {
      return planService.deletePlan(ctx.db, ctx.organizationId, input.id);
    }),

  addScope: protectedProcedure
    .input(addScopeInput)
    .mutation(async ({ ctx, input }) => {
      return planService.addScope(ctx.db, ctx.organizationId, input);
    }),

  removeScope: protectedProcedure
    .input(removeScopeInput)
    .mutation(async ({ ctx, input }) => {
      return planService.removeScope(ctx.db, ctx.organizationId, input.id);
    }),

  getTimeline: protectedProcedure
    .input(getTimelineInput)
    .query(async ({ ctx, input }) => {
      return planService.getTimeline(
        ctx.db,
        ctx.organizationId,
        input.planId,
      );
    }),

  createScenario: protectedProcedure
    .input(createScenarioInput)
    .mutation(async ({ ctx, input }) => {
      return planService.createScenario(ctx.db, ctx.organizationId, input);
    }),

  updateScenario: protectedProcedure
    .input(updateScenarioInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return planService.updateScenario(
        ctx.db,
        ctx.organizationId,
        id,
        updates,
      );
    }),

  deleteScenario: protectedProcedure
    .input(deleteScenarioInput)
    .mutation(async ({ ctx, input }) => {
      return planService.deleteScenario(ctx.db, ctx.organizationId, input.id);
    }),
});

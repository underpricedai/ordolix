/**
 * tRPC router for the Budgets module.
 * @module budget-router
 */

import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createBudgetInput,
  updateBudgetInput,
  listBudgetsInput,
  setCostRateInput,
  budgetSummaryInput,
  projectCostSummaryInput,
} from "../types/schemas";
import { z } from "zod";
import * as budgetService from "./budget-service";

export const budgetRouter = createRouter({
  create: protectedProcedure
    .input(createBudgetInput)
    .mutation(async ({ ctx, input }) => {
      return budgetService.createBudget(ctx.db, ctx.organizationId, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return budgetService.getBudget(ctx.db, ctx.organizationId, input.id);
    }),

  list: protectedProcedure
    .input(listBudgetsInput)
    .query(async ({ ctx, input }) => {
      return budgetService.listBudgets(
        ctx.db,
        ctx.organizationId,
        input.projectId,
      );
    }),

  update: protectedProcedure
    .input(updateBudgetInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return budgetService.updateBudget(ctx.db, ctx.organizationId, id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return budgetService.deleteBudget(ctx.db, ctx.organizationId, input.id);
    }),

  setCostRate: protectedProcedure
    .input(setCostRateInput)
    .mutation(async ({ ctx, input }) => {
      return budgetService.setCostRate(ctx.db, ctx.organizationId, input);
    }),

  listCostRates: protectedProcedure.query(async ({ ctx }) => {
    return budgetService.listCostRates(ctx.db, ctx.organizationId);
  }),

  deleteCostRate: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return budgetService.deleteCostRate(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  summary: protectedProcedure
    .input(budgetSummaryInput)
    .query(async ({ ctx, input }) => {
      return budgetService.getBudgetSummary(
        ctx.db,
        ctx.organizationId,
        input.budgetId,
      );
    }),

  projectCostSummary: protectedProcedure
    .input(projectCostSummaryInput)
    .query(async ({ ctx, input }) => {
      return budgetService.getProjectCostSummary(
        ctx.db,
        ctx.organizationId,
        input.projectId,
      );
    }),
});

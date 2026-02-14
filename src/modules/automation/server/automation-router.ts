import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createAutomationRuleInput,
  updateAutomationRuleInput,
  listAutomationRulesInput,
  executeRuleInput,
} from "../types/schemas";
import * as automationService from "./automation-service";

export const automationRouter = createRouter({
  create: protectedProcedure
    .input(createAutomationRuleInput)
    .mutation(async ({ ctx, input }) => {
      return automationService.createRule(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return automationService.getRule(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  list: protectedProcedure
    .input(listAutomationRulesInput)
    .query(async ({ ctx, input }) => {
      return automationService.listRules(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateAutomationRuleInput)
    .mutation(async ({ ctx, input }) => {
      return automationService.updateRule(
        ctx.db,
        ctx.organizationId,
        input.id,
        input,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return automationService.deleteRule(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  execute: protectedProcedure
    .input(executeRuleInput)
    .mutation(async ({ ctx, input }) => {
      return automationService.executeRule(
        ctx.db,
        ctx.organizationId,
        input.ruleId,
        input.issueId,
      );
    }),
});

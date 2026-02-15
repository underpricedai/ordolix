/**
 * Survey/CSAT tRPC router.
 *
 * @description Provides procedures for survey template CRUD (admin),
 * response submission, and statistics queries (protected).
 *
 * @module survey-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import {
  createTemplateInput,
  updateTemplateInput,
  submitResponseInput,
  getResponsesForTemplateInput,
  surveyStatsInput,
  agentPerformanceInput,
} from "../types/schemas";
import * as surveyService from "./survey-service";

export const surveyRouter = createRouter({
  // ── Template CRUD (Admin) ─────────────────────────────────────────────────

  createTemplate: adminProcedure
    .input(createTemplateInput)
    .mutation(async ({ ctx, input }) => {
      return surveyService.createTemplate(ctx.db, ctx.organizationId, input);
    }),

  updateTemplate: adminProcedure
    .input(updateTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return surveyService.updateTemplate(ctx.db, ctx.organizationId, id, data);
    }),

  listTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return surveyService.listTemplates(ctx.db, ctx.organizationId);
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return surveyService.getTemplate(ctx.db, ctx.organizationId, input.id);
    }),

  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return surveyService.deleteTemplate(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Response Submission ─────────────────────────────────────────────────────

  submitResponse: protectedProcedure
    .input(submitResponseInput)
    .mutation(async ({ ctx, input }) => {
      return surveyService.submitResponse(
        ctx.db,
        ctx.organizationId,
        input,
        ctx.session.user.id ?? undefined,
      );
    }),

  // ── Response Queries ────────────────────────────────────────────────────────

  getResponsesForIssue: protectedProcedure
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return surveyService.getResponsesForIssue(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  getResponsesForTemplate: protectedProcedure
    .input(getResponsesForTemplateInput)
    .query(async ({ ctx, input }) => {
      const { templateId, ...pagination } = input;
      return surveyService.getResponsesForTemplate(
        ctx.db,
        ctx.organizationId,
        templateId,
        pagination,
      );
    }),

  // ── Statistics ──────────────────────────────────────────────────────────────

  getStats: protectedProcedure
    .input(surveyStatsInput ?? z.undefined())
    .query(async ({ ctx, input }) => {
      return surveyService.getSurveyStats(ctx.db, ctx.organizationId, input);
    }),

  getAgentPerformance: protectedProcedure
    .input(agentPerformanceInput ?? z.undefined())
    .query(async ({ ctx, input }) => {
      return surveyService.getAgentPerformance(ctx.db, ctx.organizationId, input);
    }),
});

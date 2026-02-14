import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createTestSuiteInput,
  updateTestSuiteInput,
  createTestCaseInput,
  updateTestCaseInput,
  listTestCasesInput,
  createTestRunInput,
  updateTestRunStatusInput,
  listTestRunsInput,
  recordTestResultInput,
} from "../types/schemas";
import * as tmService from "./test-management-service";

export const testManagementRouter = createRouter({
  // ── Test Suites ──────────────────────────────────────────────────────────
  createSuite: protectedProcedure
    .input(createTestSuiteInput)
    .mutation(async ({ ctx, input }) => {
      return tmService.createTestSuite(ctx.db, ctx.organizationId, input);
    }),

  getSuite: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return tmService.getTestSuite(ctx.db, ctx.organizationId, input.id);
    }),

  listSuites: protectedProcedure.query(async ({ ctx }) => {
    return tmService.listTestSuites(ctx.db, ctx.organizationId);
  }),

  updateSuite: protectedProcedure
    .input(updateTestSuiteInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return tmService.updateTestSuite(ctx.db, ctx.organizationId, id, updates);
    }),

  deleteSuite: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return tmService.deleteTestSuite(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Test Cases ───────────────────────────────────────────────────────────
  createCase: protectedProcedure
    .input(createTestCaseInput)
    .mutation(async ({ ctx, input }) => {
      return tmService.createTestCase(ctx.db, ctx.organizationId, input);
    }),

  getCase: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return tmService.getTestCase(ctx.db, ctx.organizationId, input.id);
    }),

  listCases: protectedProcedure
    .input(listTestCasesInput)
    .query(async ({ ctx, input }) => {
      return tmService.listTestCases(ctx.db, ctx.organizationId, input);
    }),

  updateCase: protectedProcedure
    .input(updateTestCaseInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return tmService.updateTestCase(ctx.db, ctx.organizationId, id, updates);
    }),

  deleteCase: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return tmService.deleteTestCase(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Test Runs ────────────────────────────────────────────────────────────
  createRun: protectedProcedure
    .input(createTestRunInput)
    .mutation(async ({ ctx, input }) => {
      return tmService.createTestRun(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getRun: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return tmService.getTestRun(ctx.db, ctx.organizationId, input.id);
    }),

  listRuns: protectedProcedure
    .input(listTestRunsInput)
    .query(async ({ ctx, input }) => {
      return tmService.listTestRuns(ctx.db, ctx.organizationId, input);
    }),

  updateRunStatus: protectedProcedure
    .input(updateTestRunStatusInput)
    .mutation(async ({ ctx, input }) => {
      return tmService.updateTestRunStatus(
        ctx.db,
        ctx.organizationId,
        input.id,
        input.status,
      );
    }),

  deleteRun: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return tmService.deleteTestRun(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Test Results ─────────────────────────────────────────────────────────
  recordResult: protectedProcedure
    .input(recordTestResultInput)
    .mutation(async ({ ctx, input }) => {
      return tmService.recordTestResult(ctx.db, ctx.organizationId, input);
    }),
});

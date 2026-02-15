// NOTE: When workflow CRUD mutations are added, use adminProcedure (workflows are org-wide config)
import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import {
  transitionIssueInput,
  getAvailableTransitionsInput,
  getWorkflowForProjectInput,
} from "../types/schemas";
import * as workflowEngine from "./workflow-engine";
import { workflowSchemeAdapter } from "./workflow-scheme-adapter";
import {
  forkScheme,
  cloneSchemeIndependent,
} from "@/shared/lib/scheme-sharing-service";

export const workflowRouter = createRouter({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return workflowEngine.listWorkflows(ctx.db, ctx.organizationId);
    }),

  // TODO: service-level permission check (TRANSITION_ISSUES — projectId resolved from issue)
  transition: protectedProcedure
    .input(transitionIssueInput)
    .mutation(async ({ ctx, input }) => {
      return workflowEngine.transitionIssue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.issueId,
        input.transitionId,
      );
    }),

  getAvailableTransitions: protectedProcedure
    .input(getAvailableTransitionsInput)
    .query(async ({ ctx, input }) => {
      return workflowEngine.getAvailableTransitions(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  getWorkflowForProject: protectedProcedure
    .input(getWorkflowForProjectInput)
    .query(async ({ ctx, input }) => {
      return workflowEngine.getWorkflowForProject(
        ctx.db,
        ctx.organizationId,
        input.projectId,
      );
    }),

  /** Fork a workflow for a specific project (clone + reassign). */
  fork: adminProcedure
    .input(z.object({
      workflowId: z.string().min(1),
      projectId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return forkScheme(
        workflowSchemeAdapter,
        ctx.db,
        input.workflowId,
        input.projectId,
        ctx.organizationId,
      );
    }),

  /** Clone a workflow as an independent copy. */
  clone: adminProcedure
    .input(z.object({
      sourceId: z.string().min(1),
      newName: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      return cloneSchemeIndependent(
        workflowSchemeAdapter,
        ctx.db,
        input.sourceId,
        input.newName,
        ctx.organizationId,
      );
    }),
});

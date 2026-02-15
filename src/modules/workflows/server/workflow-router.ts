// NOTE: When workflow CRUD mutations are added, use adminProcedure (workflows are org-wide config)
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  transitionIssueInput,
  getAvailableTransitionsInput,
  getWorkflowForProjectInput,
} from "../types/schemas";
import * as workflowEngine from "./workflow-engine";

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
});

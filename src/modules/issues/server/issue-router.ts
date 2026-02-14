import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import { createIssueInput, updateIssueInput, listIssuesInput } from "../types/schemas";
import * as issueService from "./issue-service";

export const issueRouter = createRouter({
  create: protectedProcedure
    .input(createIssueInput)
    .mutation(async ({ ctx, input }) => {
      // protectedProcedure guarantees session.user.id and organizationId exist
      return issueService.createIssue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getByKey: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return issueService.getIssueByKey(ctx.db, ctx.organizationId, input.key);
    }),

  list: protectedProcedure
    .input(listIssuesInput)
    .query(async ({ ctx, input }) => {
      return issueService.listIssues(ctx.db, ctx.organizationId, input);
    }),

  update: protectedProcedure
    .input(updateIssueInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return issueService.updateIssue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        id,
        updates,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return issueService.deleteIssue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),
});

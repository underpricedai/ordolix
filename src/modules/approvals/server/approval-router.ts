import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  requestApprovalInput,
  decideApprovalInput,
  listApprovalsInput,
  listPendingApprovalsInput,
} from "../types/schemas";
import * as approvalService from "./approval-service";

export const approvalRouter = createRouter({
  request: protectedProcedure
    .input(requestApprovalInput)
    .mutation(async ({ ctx, input }) => {
      return approvalService.requestApproval(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  list: protectedProcedure
    .input(listApprovalsInput)
    .query(async ({ ctx, input }) => {
      return approvalService.getApprovals(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  decide: protectedProcedure
    .input(decideApprovalInput)
    .mutation(async ({ ctx, input }) => {
      return approvalService.decide(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
        input.decision,
        input.comment,
      );
    }),

  pending: protectedProcedure
    .input(listPendingApprovalsInput)
    .query(async ({ ctx, input }) => {
      return approvalService.getPendingApprovals(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),
});

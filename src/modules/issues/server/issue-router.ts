import { z } from "zod";
import { createRouter, protectedProcedure, requirePermission } from "@/server/trpc/init";
import {
  createIssueInput,
  updateIssueInput,
  listIssuesInput,
  listHistoryInput,
  watcherInput,
  addWatcherInput,
  voteInput,
  listCommentsInput,
  createCommentInput,
  updateCommentInput,
  deleteCommentInput,
  getChildrenInput,
  createLinkInput,
  deleteLinkInput,
  getLinksInput,
  listAttachmentsInput,
  deleteAttachmentInput,
} from "../types/schemas";
import * as issueService from "./issue-service";

export const issueRouter = createRouter({
  create: requirePermission("CREATE_ISSUES")
    .input(createIssueInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.createIssue(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return issueService.getIssueById(ctx.db, ctx.organizationId, input.id);
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

  // TODO: service-level permission check (EDIT_ISSUES — projectId resolved from issue)
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

  // TODO: service-level permission check (DELETE_ISSUES — projectId resolved from issue)
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

  // ── History ────────────────────────────────────────────────────────────

  getHistory: protectedProcedure
    .input(listHistoryInput)
    .query(async ({ ctx, input }) => {
      return issueService.getIssueHistory(
        ctx.db,
        ctx.organizationId,
        input.issueId,
        input,
      );
    }),

  // ── Watchers ───────────────────────────────────────────────────────────

  toggleWatch: protectedProcedure
    .input(watcherInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.toggleWatch(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.issueId,
      );
    }),

  addWatcher: protectedProcedure
    .input(addWatcherInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.addWatcher(
        ctx.db,
        ctx.organizationId,
        input.issueId,
        input.userId,
      );
    }),

  removeWatcher: protectedProcedure
    .input(addWatcherInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.removeWatcher(
        ctx.db,
        ctx.organizationId,
        input.issueId,
        input.userId,
      );
    }),

  listWatchers: protectedProcedure
    .input(watcherInput)
    .query(async ({ ctx, input }) => {
      return issueService.listWatchers(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  // ── Voting ─────────────────────────────────────────────────────────────

  toggleVote: protectedProcedure
    .input(voteInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.toggleVote(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.issueId,
      );
    }),

  getVoteStatus: protectedProcedure
    .input(voteInput)
    .query(async ({ ctx, input }) => {
      return issueService.getVoteStatus(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.issueId,
      );
    }),

  // ── Comments ───────────────────────────────────────────────────────────

  listComments: protectedProcedure
    .input(listCommentsInput)
    .query(async ({ ctx, input }) => {
      return issueService.listComments(ctx.db, ctx.organizationId, input);
    }),

  addComment: protectedProcedure
    .input(createCommentInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.addComment(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  editComment: protectedProcedure
    .input(updateCommentInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.editComment(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  deleteComment: protectedProcedure
    .input(deleteCommentInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.deleteComment(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  // ── Subtasks ───────────────────────────────────────────────────────────

  getChildren: protectedProcedure
    .input(getChildrenInput)
    .query(async ({ ctx, input }) => {
      return issueService.getChildren(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  // ── Issue Linking ──────────────────────────────────────────────────────

  createLink: protectedProcedure
    .input(createLinkInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.createLink(ctx.db, ctx.organizationId, input);
    }),

  deleteLink: protectedProcedure
    .input(deleteLinkInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.deleteLink(ctx.db, ctx.organizationId, input.id);
    }),

  getLinks: protectedProcedure
    .input(getLinksInput)
    .query(async ({ ctx, input }) => {
      return issueService.getLinks(ctx.db, ctx.organizationId, input.issueId);
    }),

  // ── Attachments ────────────────────────────────────────────────────────

  listAttachments: protectedProcedure
    .input(listAttachmentsInput)
    .query(async ({ ctx, input }) => {
      return issueService.listAttachments(
        ctx.db,
        ctx.organizationId,
        input.issueId,
      );
    }),

  deleteAttachment: protectedProcedure
    .input(deleteAttachmentInput)
    .mutation(async ({ ctx, input }) => {
      return issueService.deleteAttachment(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  // ── Filter Options (read-only for all users) ─────────────────────────

  listIssueTypes: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.issueType.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true, icon: true },
        orderBy: { name: "asc" },
      });
    }),

  listPriorities: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.priority.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true, color: true },
        orderBy: { rank: "asc" },
      });
    }),

  listStatuses: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findFirst({
        where: {
          projects: { some: { id: input.projectId, organizationId: ctx.organizationId } },
        },
        include: {
          workflowStatuses: {
            include: { status: { select: { id: true, name: true, category: true } } },
            orderBy: { position: "asc" },
          },
        },
      });
      return workflow?.workflowStatuses.map((ws) => ws.status) ?? [];
    }),
});

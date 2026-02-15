/**
 * Integration config tRPC router.
 * @module integrations/server/integration-router
 */
import { z } from "zod";
import { adminProcedure, createRouter, protectedProcedure } from "@/server/trpc/init";
import * as githubService from "@/integrations/github/github-service";

export const integrationRouter = createRouter({
  getGitHubConfig: protectedProcedure.query(async ({ ctx }) => {
    return githubService.getConfig(ctx.db, ctx.organizationId);
  }),

  upsertGitHubConfig: adminProcedure
    .input(z.object({
      owner: z.string().min(1).max(200),
      repo: z.string().max(200).optional(),
      baseUrl: z.string().url().optional(),
      autoLink: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return githubService.upsertConfig(ctx.db, ctx.organizationId, input);
    }),

  deleteGitHubConfig: adminProcedure.mutation(async ({ ctx }) => {
    return githubService.deleteConfig(ctx.db, ctx.organizationId);
  }),

  regenerateWebhookSecret: adminProcedure.mutation(async ({ ctx }) => {
    return githubService.regenerateWebhookSecret(ctx.db, ctx.organizationId);
  }),

  getLinksForIssue: protectedProcedure
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return githubService.getLinksForIssue(ctx.db, ctx.organizationId, input.issueId);
    }),

  deleteLink: protectedProcedure
    .input(z.object({ linkId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return githubService.deleteLink(ctx.db, ctx.organizationId, input.linkId);
    }),

  getRecentLinks: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ ctx, input }) => {
      return githubService.getRecentLinks(ctx.db, ctx.organizationId, input.limit);
    }),
});

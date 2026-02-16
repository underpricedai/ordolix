/**
 * AI integration tRPC router.
 *
 * Provides procedures for AI-powered features including issue summarization,
 * label suggestions, description generation, and related issue discovery.
 * All procedures require authentication and gracefully handle AI service
 * unavailability.
 *
 * @module integrations/ai/ai-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import * as aiService from "./ai-service";

export const aiRouter = createRouter({
  /**
   * Check whether AI features are available (API key configured).
   *
   * @returns Object with `available` boolean indicating if AI service can be used
   */
  status: protectedProcedure.query(() => {
    return { available: aiService.isAIAvailable() };
  }),

  /**
   * Summarize an issue and its comments into 2-3 concise sentences.
   *
   * Fetches the issue and its comments from the database, then uses the
   * Perplexity AI to generate a brief summary.
   *
   * @param issueId - The ID of the issue to summarize
   * @returns Object with `summary` string or `error` string on failure
   */
  summarize: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const issue = await ctx.db.issue.findFirst({
          where: {
            id: input.issueId,
            organizationId: ctx.organizationId,
            deletedAt: null,
          },
          select: {
            summary: true,
            description: true,
          },
        });

        if (!issue) {
          return { summary: null, error: "Issue not found" };
        }

        const comments = await ctx.db.comment.findMany({
          where: {
            issueId: input.issueId,
            organizationId: ctx.organizationId,
          },
          select: {
            body: true,
            author: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
        });

        const summary = await aiService.summarizeIssue({
          summary: issue.summary,
          description: issue.description,
          comments: comments.map((c) => ({
            body: c.body,
            author: c.author?.name ?? "Unknown",
          })),
        });

        return { summary, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed";
        return { summary: null, error: message };
      }
    }),

  /**
   * Suggest labels for an issue based on its content and available labels.
   *
   * @param issueId - The ID of the issue to suggest labels for
   * @returns Object with `labels` string array or `error` string on failure
   */
  suggestLabels: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const issue = await ctx.db.issue.findFirst({
          where: {
            id: input.issueId,
            organizationId: ctx.organizationId,
            deletedAt: null,
          },
          select: {
            summary: true,
            description: true,
            labels: true,
          },
        });

        if (!issue) {
          return { labels: [], error: "Issue not found" };
        }

        // Gather available labels from all issues in the organization
        const allIssues = await ctx.db.issue.findMany({
          where: {
            organizationId: ctx.organizationId,
            deletedAt: null,
            labels: { isEmpty: false },
          },
          select: { labels: true },
          take: 500,
        });

        const availableLabels = [
          ...new Set(allIssues.flatMap((i) => i.labels)),
        ];

        const labels = await aiService.suggestLabels({
          summary: issue.summary,
          description: issue.description,
          existingLabels: issue.labels,
          availableLabels,
        });

        return { labels, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed";
        return { labels: [], error: message };
      }
    }),

  /**
   * Generate a structured description template based on issue summary and type.
   *
   * @param summary - The issue summary text
   * @param issueType - The type of issue (e.g., "Bug", "Story", "Task")
   * @returns Object with `description` string or `error` string on failure
   */
  generateDescription: protectedProcedure
    .input(
      z.object({
        summary: z.string().min(1),
        issueType: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const description = await aiService.generateDescription(
          input.summary,
          input.issueType,
        );

        return { description, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed";
        return { description: null, error: message };
      }
    }),

  /**
   * Find issues potentially related to the given issue.
   *
   * Fetches recent issues from the same project and uses AI to identify
   * which ones are most likely related.
   *
   * @param issueId - The ID of the issue to find relations for
   * @returns Object with `related` array of { key, reason } or `error` string on failure
   */
  suggestRelated: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const issue = await ctx.db.issue.findFirst({
          where: {
            id: input.issueId,
            organizationId: ctx.organizationId,
            deletedAt: null,
          },
          select: {
            summary: true,
            projectId: true,
          },
        });

        if (!issue) {
          return { related: [], error: "Issue not found" };
        }

        // Get recent issues from the same project, excluding the current one
        const candidateIssues = await ctx.db.issue.findMany({
          where: {
            organizationId: ctx.organizationId,
            projectId: issue.projectId,
            id: { not: input.issueId },
            deletedAt: null,
          },
          select: {
            key: true,
            summary: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        });

        const related = await aiService.suggestRelatedIssues(
          issue.summary,
          candidateIssues,
        );

        return { related, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed";
        return { related: [], error: message };
      }
    }),
});

/**
 * Survey/CSAT service layer.
 *
 * @description Business logic for survey template CRUD, response submission,
 * aggregate statistics, and agent performance metrics.
 *
 * @module survey-service
 */

import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  SubmitResponseInput,
  GetResponsesForTemplateInput,
  SurveyStatsInput,
  AgentPerformanceInput,
} from "../types/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

// ── Template CRUD ─────────────────────────────────────────────────────────────

/**
 * Creates a new survey template.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param input - Template creation input
 * @returns The created template
 * @throws ValidationError if a template with the same name already exists
 */
export async function createTemplate(
  db: DB,
  orgId: string,
  input: CreateTemplateInput,
) {
  const existing = await db.surveyTemplate.findFirst({
    where: { organizationId: orgId, name: input.name },
  });
  if (existing) {
    throw new ValidationError("A survey template with this name already exists");
  }

  return db.surveyTemplate.create({
    data: {
      organizationId: orgId,
      name: input.name,
      description: input.description ?? null,
      trigger: input.trigger,
      isActive: input.isActive,
      delayMinutes: input.delayMinutes,
      questions: input.questions,
    },
  });
}

/**
 * Updates an existing survey template.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param id - Template ID
 * @param input - Partial fields to update
 * @returns The updated template
 * @throws NotFoundError if template not found
 */
export async function updateTemplate(
  db: DB,
  orgId: string,
  id: string,
  input: Omit<UpdateTemplateInput, "id">,
) {
  const existing = await db.surveyTemplate.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    throw new NotFoundError("SurveyTemplate", id);
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.trigger !== undefined) data.trigger = input.trigger;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.delayMinutes !== undefined) data.delayMinutes = input.delayMinutes;
  if (input.questions !== undefined) data.questions = input.questions;

  return db.surveyTemplate.update({
    where: { id },
    data,
  });
}

/**
 * Lists all survey templates for an organization.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @returns Array of templates with response counts
 */
export async function listTemplates(db: DB, orgId: string) {
  return db.surveyTemplate.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { responses: true } },
    },
  });
}

/**
 * Gets a single survey template by ID.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param id - Template ID
 * @returns The template with response count
 * @throws NotFoundError if not found
 */
export async function getTemplate(db: DB, orgId: string, id: string) {
  const template = await db.surveyTemplate.findFirst({
    where: { id, organizationId: orgId },
    include: {
      _count: { select: { responses: true } },
    },
  });
  if (!template) {
    throw new NotFoundError("SurveyTemplate", id);
  }
  return template;
}

/**
 * Deletes a survey template and all its responses (cascade).
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param id - Template ID
 * @returns The deleted template
 * @throws NotFoundError if not found
 */
export async function deleteTemplate(db: DB, orgId: string, id: string) {
  const existing = await db.surveyTemplate.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    throw new NotFoundError("SurveyTemplate", id);
  }

  return db.surveyTemplate.delete({
    where: { id },
  });
}

// ── Response Submission ───────────────────────────────────────────────────────

/**
 * Submits a survey response.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param input - Response data (templateId, starRating, answers, comment)
 * @param respondentId - Optional authenticated user ID
 * @returns The created response
 * @throws NotFoundError if template not found
 */
export async function submitResponse(
  db: DB,
  orgId: string,
  input: SubmitResponseInput,
  respondentId?: string,
) {
  const template = await db.surveyTemplate.findFirst({
    where: { id: input.templateId, organizationId: orgId },
  });
  if (!template) {
    throw new NotFoundError("SurveyTemplate", input.templateId);
  }

  return db.surveyResponse.create({
    data: {
      organizationId: orgId,
      templateId: input.templateId,
      issueId: input.issueId ?? null,
      respondentId: respondentId ?? null,
      respondentEmail: input.respondentEmail ?? null,
      starRating: input.starRating ?? null,
      answers: input.answers,
      comment: input.comment ?? null,
    },
  });
}

// ── Response Queries ──────────────────────────────────────────────────────────

/**
 * Gets all survey responses for a specific issue.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param issueId - Issue ID
 * @returns Array of responses for the issue
 */
export async function getResponsesForIssue(
  db: DB,
  orgId: string,
  issueId: string,
) {
  return db.surveyResponse.findMany({
    where: { organizationId: orgId, issueId },
    orderBy: { submittedAt: "desc" },
    include: {
      template: { select: { id: true, name: true } },
    },
  });
}

/**
 * Gets paginated survey responses for a template.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param templateId - Template ID
 * @param input - Pagination input (limit, cursor)
 * @returns Paginated response items with nextCursor
 */
export async function getResponsesForTemplate(
  db: DB,
  orgId: string,
  templateId: string,
  input: Omit<GetResponsesForTemplateInput, "templateId">,
) {
  const items = await db.surveyResponse.findMany({
    where: { organizationId: orgId, templateId },
    orderBy: { submittedAt: "desc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  const nextCursor =
    items.length === input.limit && items.length > 0
      ? items[items.length - 1]?.id ?? undefined
      : undefined;

  return { items, nextCursor };
}

// ── Statistics ────────────────────────────────────────────────────────────────

/**
 * Gets aggregate survey statistics.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param input - Optional filters (templateId, projectId, date range)
 * @returns Average rating, response count, distribution, project breakdown, trend
 */
export async function getSurveyStats(
  db: DB,
  orgId: string,
  input?: SurveyStatsInput,
) {
  const where: Record<string, unknown> = { organizationId: orgId };
  if (input?.templateId) where.templateId = input.templateId;
  if (input?.dateFrom || input?.dateTo) {
    where.submittedAt = {
      ...(input?.dateFrom ? { gte: input.dateFrom } : {}),
      ...(input?.dateTo ? { lte: input.dateTo } : {}),
    };
  }

  // Get all responses matching the filter
  const responses = await db.surveyResponse.findMany({
    where,
    select: {
      starRating: true,
      submittedAt: true,
      issueId: true,
    },
  });

  const rated = responses.filter(
    (r: { starRating: number | null }) => r.starRating !== null,
  );
  const totalResponses = responses.length;

  // Average star rating
  const avgRating =
    rated.length > 0
      ? rated.reduce(
          (sum: number, r: { starRating: number }) => sum + r.starRating,
          0,
        ) / rated.length
      : 0;

  // Rating distribution
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rated) {
    const rating = (r as { starRating: number }).starRating;
    distribution[rating] = (distribution[rating] ?? 0) + 1;
  }

  // Trend over last 30 days (daily counts + avg)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trendMap = new Map<string, { count: number; sum: number }>();
  for (const r of responses) {
    const resp = r as { submittedAt: Date; starRating: number | null };
    if (resp.submittedAt >= thirtyDaysAgo) {
      const day = resp.submittedAt.toISOString().slice(0, 10);
      const entry = trendMap.get(day) ?? { count: 0, sum: 0 };
      entry.count++;
      if (resp.starRating !== null) entry.sum += resp.starRating;
      trendMap.set(day, entry);
    }
  }

  const trend = Array.from(trendMap.entries())
    .map(([date, { count, sum }]) => ({
      date,
      count,
      avgRating: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    avgRating: Math.round(avgRating * 100) / 100,
    totalResponses,
    ratedResponses: rated.length,
    distribution,
    trend,
  };
}

/**
 * Gets per-assignee (agent) performance metrics.
 *
 * @param db - Prisma client
 * @param orgId - Organization ID
 * @param input - Optional filters (templateId, projectId, date range, limit)
 * @returns Array of agent stats with avg rating, response count, comment excerpts
 */
export async function getAgentPerformance(
  db: DB,
  orgId: string,
  input?: AgentPerformanceInput,
) {
  const where: Record<string, unknown> = {
    organizationId: orgId,
    issueId: { not: null },
  };
  if (input?.templateId) where.templateId = input.templateId;
  if (input?.dateFrom || input?.dateTo) {
    where.submittedAt = {
      ...(input?.dateFrom ? { gte: input.dateFrom } : {}),
      ...(input?.dateTo ? { lte: input.dateTo } : {}),
    };
  }

  const responses = await db.surveyResponse.findMany({
    where,
    select: {
      starRating: true,
      comment: true,
      issueId: true,
    },
  });

  // Look up issue assignees
  const issueIds = [
    ...new Set(
      responses
        .map((r: { issueId: string | null }) => r.issueId)
        .filter(Boolean) as string[],
    ),
  ];

  if (issueIds.length === 0) return [];

  const issues = await db.issue.findMany({
    where: { id: { in: issueIds }, organizationId: orgId },
    select: {
      id: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  const issueMap = new Map<string, { assigneeId: string | null; assignee: { id: string; name: string | null; image: string | null } | null }>();
  for (const issue of issues) {
    issueMap.set(issue.id, issue);
  }

  // Aggregate by assignee
  const agentMap = new Map<
    string,
    {
      agent: { id: string; name: string | null; image: string | null };
      ratings: number[];
      comments: string[];
    }
  >();

  for (const r of responses) {
    const resp = r as { issueId: string | null; starRating: number | null; comment: string | null };
    if (!resp.issueId) continue;
    const issue = issueMap.get(resp.issueId);
    if (!issue?.assigneeId || !issue.assignee) continue;

    let entry = agentMap.get(issue.assigneeId);
    if (!entry) {
      entry = {
        agent: issue.assignee,
        ratings: [],
        comments: [],
      };
      agentMap.set(issue.assigneeId, entry);
    }

    if (resp.starRating !== null) entry.ratings.push(resp.starRating);
    if (resp.comment) entry.comments.push(resp.comment);
  }

  const limit = input?.limit ?? 20;

  return Array.from(agentMap.values())
    .map((entry) => ({
      agent: entry.agent,
      avgRating:
        entry.ratings.length > 0
          ? Math.round(
              (entry.ratings.reduce((a, b) => a + b, 0) / entry.ratings.length) *
                100,
            ) / 100
          : 0,
      responseCount: entry.ratings.length,
      recentComments: entry.comments.slice(0, 3),
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit);
}

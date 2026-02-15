/**
 * Zod schemas for survey/CSAT module inputs.
 *
 * @module survey-schemas
 */

import { z } from "zod";

// ── Survey Question Schema ────────────────────────────────────────────────────

export const surveyQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "rating", "select", "multiselect"]),
  label: z.string().min(1),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

// ── Template Inputs ───────────────────────────────────────────────────────────

export const createTemplateInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  trigger: z.string().min(1).default("issue_resolved"),
  isActive: z.boolean().default(true),
  delayMinutes: z.number().int().min(0).max(10080).default(30),
  questions: z.array(surveyQuestionSchema).default([]),
});

export type CreateTemplateInput = z.infer<typeof createTemplateInput>;

export const updateTemplateInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  trigger: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  delayMinutes: z.number().int().min(0).max(10080).optional(),
  questions: z.array(surveyQuestionSchema).optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateInput>;

// ── Response Inputs ───────────────────────────────────────────────────────────

export const submitResponseInput = z.object({
  templateId: z.string().min(1),
  issueId: z.string().optional(),
  respondentEmail: z.string().email().optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
  comment: z.string().max(5000).optional(),
});

export type SubmitResponseInput = z.infer<typeof submitResponseInput>;

export const getResponsesForTemplateInput = z.object({
  templateId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type GetResponsesForTemplateInput = z.infer<typeof getResponsesForTemplateInput>;

// ── Stats Inputs ──────────────────────────────────────────────────────────────

export const surveyStatsInput = z.object({
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
}).optional();

export type SurveyStatsInput = z.infer<typeof surveyStatsInput>;

export const agentPerformanceInput = z.object({
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(50).default(20),
}).optional();

export type AgentPerformanceInput = z.infer<typeof agentPerformanceInput>;

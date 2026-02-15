/**
 * Zod validation schemas for the Budgets module.
 * @module budget-schemas
 */

import { z } from "zod";

// ── Budget Schemas ─────────────────────────────────────────────────────────

export const createBudgetInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().min(1).max(10).default("USD"),
  costType: z.enum(["capex", "opex"]).default("opex"),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  alertThreshold: z.number().int().min(0).max(100).default(80),
});

export type CreateBudgetInput = z.infer<typeof createBudgetInput>;

export const updateBudgetInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().min(1).max(10).optional(),
  costType: z.enum(["capex", "opex"]).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  alertThreshold: z.number().int().min(0).max(100).optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetInput>;

export const listBudgetsInput = z.object({
  projectId: z.string().optional(),
});

export type ListBudgetsInput = z.infer<typeof listBudgetsInput>;

// ── Cost Rate Schemas ──────────────────────────────────────────────────────

export const setCostRateInput = z.object({
  userId: z.string().optional(),
  projectRoleId: z.string().optional(),
  ratePerHour: z.number().positive(),
  currency: z.string().min(1).max(10).default("USD"),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});

export type SetCostRateInput = z.infer<typeof setCostRateInput>;

// ── Summary Schemas ────────────────────────────────────────────────────────

export const budgetSummaryInput = z.object({
  budgetId: z.string().min(1),
});

export type BudgetSummaryInput = z.infer<typeof budgetSummaryInput>;

export const projectCostSummaryInput = z.object({
  projectId: z.string().min(1),
});

export type ProjectCostSummaryInput = z.infer<typeof projectCostSummaryInput>;

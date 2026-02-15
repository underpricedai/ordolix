/**
 * Zod input schemas for the plans module.
 * @module plan-schemas
 */

import { z } from "zod";

// ── Plan CRUD ────────────────────────────────────────────────────────────────

export const createPlanInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isShared: z.boolean().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanInput>;

export const updatePlanInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isShared: z.boolean().optional(),
  status: z.string().optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanInput>;

export const deletePlanInput = z.object({
  id: z.string().min(1),
});

export type DeletePlanInput = z.infer<typeof deletePlanInput>;

// ── Scope ────────────────────────────────────────────────────────────────────

export const addScopeInput = z.object({
  planId: z.string().min(1),
  projectId: z.string().min(1),
  issueId: z.string().optional(),
  position: z.number().int().optional(),
});

export type AddScopeInput = z.infer<typeof addScopeInput>;

export const removeScopeInput = z.object({
  id: z.string().min(1),
});

export type RemoveScopeInput = z.infer<typeof removeScopeInput>;

// ── Timeline ─────────────────────────────────────────────────────────────────

export const getTimelineInput = z.object({
  planId: z.string().min(1),
});

export type GetTimelineInput = z.infer<typeof getTimelineInput>;

// ── Scenario ─────────────────────────────────────────────────────────────────

export const createScenarioInput = z.object({
  planId: z.string().min(1),
  name: z.string().min(1),
  isDraft: z.boolean().optional(),
  isBaseline: z.boolean().optional(),
});

export type CreateScenarioInput = z.infer<typeof createScenarioInput>;

export const updateScenarioInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  isDraft: z.boolean().optional(),
  isBaseline: z.boolean().optional(),
  overrides: z.any().optional(),
});

export type UpdateScenarioInput = z.infer<typeof updateScenarioInput>;

export const deleteScenarioInput = z.object({
  id: z.string().min(1),
});

export type DeleteScenarioInput = z.infer<typeof deleteScenarioInput>;

// ── GetById ──────────────────────────────────────────────────────────────────

export const getPlanByIdInput = z.object({
  id: z.string().min(1),
});

export type GetPlanByIdInput = z.infer<typeof getPlanByIdInput>;

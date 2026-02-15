import { z } from "zod";

// ── Team Capacity ───────────────────────────────────────────────────────────

export const getTeamCapacityInput = z.object({
  projectId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type GetTeamCapacityInput = z.infer<typeof getTeamCapacityInput>;

export const setTeamCapacityInput = z.object({
  projectId: z.string().min(1),
  sprintId: z.string().min(1).optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  totalHours: z.number().min(0),
  allocatedHours: z.number().min(0),
});

export type SetTeamCapacityInput = z.infer<typeof setTeamCapacityInput>;

// ── User Allocations ────────────────────────────────────────────────────────

export const setAllocationInput = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  percentage: z.number().int().min(0).max(100).optional(),
  hoursPerDay: z.number().min(0).max(24).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export type SetAllocationInput = z.infer<typeof setAllocationInput>;

export const listAllocationsInput = z.object({
  userId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});

export type ListAllocationsInput = z.infer<typeof listAllocationsInput>;

export const deleteAllocationInput = z.object({
  id: z.string().min(1),
});

export type DeleteAllocationInput = z.infer<typeof deleteAllocationInput>;

// ── Time Off ────────────────────────────────────────────────────────────────

export const addTimeOffInput = z.object({
  userId: z.string().min(1),
  date: z.coerce.date(),
  hours: z.number().min(0).max(24).optional(),
  type: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
});

export type AddTimeOffInput = z.infer<typeof addTimeOffInput>;

export const listTimeOffInput = z.object({
  userId: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ListTimeOffInput = z.infer<typeof listTimeOffInput>;

export const removeTimeOffInput = z.object({
  id: z.string().min(1),
});

export type RemoveTimeOffInput = z.infer<typeof removeTimeOffInput>;

// ── Capacity Computation ────────────────────────────────────────────────────

export const computeCapacityInput = z.object({
  projectId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type ComputeCapacityInput = z.infer<typeof computeCapacityInput>;

export const getCapacityVsLoadInput = z.object({
  projectId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type GetCapacityVsLoadInput = z.infer<typeof getCapacityVsLoadInput>;

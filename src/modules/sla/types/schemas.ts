import { z } from "zod";

export const slaMetric = z.enum([
  "time_to_first_response",
  "time_to_resolution",
  "time_to_close",
]);

export type SLAMetric = z.infer<typeof slaMetric>;

export const createSLAConfigInput = z.object({
  name: z.string().min(1).max(255),
  metric: slaMetric,
  targetDuration: z.number().int().positive(),
  projectId: z.string().optional(),
  startCondition: z.record(z.string(), z.unknown()),
  stopCondition: z.record(z.string(), z.unknown()),
  pauseConditions: z.array(z.record(z.string(), z.unknown())).default([]),
  calendar: z.record(z.string(), z.unknown()).default({}),
  escalationRules: z.array(z.record(z.string(), z.unknown())).default([]),
  isActive: z.boolean().default(true),
});

export type CreateSLAConfigInput = z.infer<typeof createSLAConfigInput>;

export const updateSLAConfigInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  metric: slaMetric.optional(),
  targetDuration: z.number().int().positive().optional(),
  projectId: z.string().optional(),
  startCondition: z.record(z.string(), z.unknown()).optional(),
  stopCondition: z.record(z.string(), z.unknown()).optional(),
  pauseConditions: z.array(z.record(z.string(), z.unknown())).optional(),
  calendar: z.record(z.string(), z.unknown()).optional(),
  escalationRules: z.array(z.record(z.string(), z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSLAConfigInput = z.infer<typeof updateSLAConfigInput>;

export const listSLAConfigsInput = z.object({
  isActive: z.boolean().optional(),
});

export type ListSLAConfigsInput = z.infer<typeof listSLAConfigsInput>;

export const startSLAInput = z.object({
  slaConfigId: z.string().min(1),
  issueId: z.string().min(1),
});

export type StartSLAInput = z.infer<typeof startSLAInput>;

export const pauseSLAInput = z.object({
  instanceId: z.string().min(1),
});

export type PauseSLAInput = z.infer<typeof pauseSLAInput>;

export const resumeSLAInput = z.object({
  instanceId: z.string().min(1),
});

export type ResumeSLAInput = z.infer<typeof resumeSLAInput>;

export const completeSLAInput = z.object({
  instanceId: z.string().min(1),
});

export type CompleteSLAInput = z.infer<typeof completeSLAInput>;

export const getSLAInstancesInput = z.object({
  issueId: z.string().min(1),
  status: z.enum(["active", "paused", "met", "breached"]).optional(),
});

export type GetSLAInstancesInput = z.infer<typeof getSLAInstancesInput>;

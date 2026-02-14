import { z } from "zod";

export const reportTypeEnum = z.enum([
  "issue_summary",
  "time_tracking",
  "sla_compliance",
  "velocity",
  "custom",
]);

export type ReportType = z.infer<typeof reportTypeEnum>;

export const visualizationTypeEnum = z.enum([
  "table",
  "bar_chart",
  "line_chart",
  "pie_chart",
  "area_chart",
]);

export type VisualizationType = z.infer<typeof visualizationTypeEnum>;

export const visualizationSchema = z.object({
  type: visualizationTypeEnum,
  config: z.record(z.string(), z.unknown()).default({}),
});

export const scheduleSchema = z.object({
  cron: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
});

export const createReportInput = z.object({
  name: z.string().min(1).max(255),
  reportType: reportTypeEnum,
  query: z.record(z.string(), z.unknown()),
  description: z.string().optional(),
  visualization: visualizationSchema.optional(),
  isShared: z.boolean().default(false),
  schedule: scheduleSchema.optional(),
});

export type CreateReportInput = z.infer<typeof createReportInput>;

export const updateReportInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  reportType: reportTypeEnum.optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
  visualization: visualizationSchema.optional(),
  isShared: z.boolean().optional(),
  schedule: scheduleSchema.optional(),
});

export type UpdateReportInput = z.infer<typeof updateReportInput>;

export const listReportsInput = z.object({
  reportType: reportTypeEnum.optional(),
  isShared: z.boolean().optional(),
});

export type ListReportsInput = z.infer<typeof listReportsInput>;

export const runReportInput = z.object({
  id: z.string().min(1),
});

export type RunReportInput = z.infer<typeof runReportInput>;

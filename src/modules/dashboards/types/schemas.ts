import { z } from "zod";

export const widgetTypeEnum = z.enum([
  "issueCount",
  "statusBreakdown",
  "assigneeWorkload",
  "recentActivity",
  "priorityDistribution",
  "sprintBurndown",
  "burndown",
  "velocityTrend",
  "cumulativeFlow",
  "custom",
]);

export type WidgetType = z.infer<typeof widgetTypeEnum>;

export const createDashboardInput = z.object({
  name: z.string().min(1).max(255),
  isShared: z.boolean().default(false),
  layout: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type CreateDashboardInput = z.infer<typeof createDashboardInput>;

export const updateDashboardInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  isShared: z.boolean().optional(),
  layout: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type UpdateDashboardInput = z.infer<typeof updateDashboardInput>;

export const addWidgetInput = z.object({
  dashboardId: z.string().min(1),
  widgetType: widgetTypeEnum,
  title: z.string().min(1).max(255),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.record(z.string(), z.unknown()).optional(),
});

export type AddWidgetInput = z.infer<typeof addWidgetInput>;

export const updateWidgetInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateWidgetInput = z.infer<typeof updateWidgetInput>;

export const deleteWidgetInput = z.object({
  id: z.string().min(1),
});

export type DeleteWidgetInput = z.infer<typeof deleteWidgetInput>;

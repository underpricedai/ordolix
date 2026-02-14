import { z } from "zod";

export const dependencyTypeEnum = z.enum(["FS", "FF", "SS", "SF"]);

export type DependencyType = z.infer<typeof dependencyTypeEnum>;

export const addDependencyInput = z.object({
  sourceIssueId: z.string().min(1),
  targetIssueId: z.string().min(1),
  dependencyType: dependencyTypeEnum.default("FS"),
  lag: z.number().int().default(0),
});

export type AddDependencyInput = z.infer<typeof addDependencyInput>;

export const removeDependencyInput = z.object({
  id: z.string().min(1),
});

export type RemoveDependencyInput = z.infer<typeof removeDependencyInput>;

export const getGanttDataInput = z.object({
  projectId: z.string().min(1),
});

export type GetGanttDataInput = z.infer<typeof getGanttDataInput>;

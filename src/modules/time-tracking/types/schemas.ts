import { z } from "zod";

export const logTimeInput = z.object({
  issueId: z.string().min(1),
  date: z.coerce.date(),
  duration: z.number().int().positive(),
  description: z.string().optional(),
  billable: z.boolean().default(true),
});

export type LogTimeInput = z.infer<typeof logTimeInput>;

export const updateTimeLogInput = z.object({
  id: z.string().min(1),
  date: z.coerce.date().optional(),
  duration: z.number().int().positive().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});

export type UpdateTimeLogInput = z.infer<typeof updateTimeLogInput>;

export const listTimeLogsInput = z.object({
  issueId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListTimeLogsInput = z.infer<typeof listTimeLogsInput>;

export const deleteTimeLogInput = z.object({
  id: z.string().min(1),
});

export type DeleteTimeLogInput = z.infer<typeof deleteTimeLogInput>;

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

// ── Timesheet Schemas ─────────────────────────────────────────────────────

export const getTimesheetInput = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type GetTimesheetInput = z.infer<typeof getTimesheetInput>;

export const submitTimesheetInput = z.object({
  id: z.string().min(1),
});

export const approveTimesheetInput = z.object({
  id: z.string().min(1),
});

export const rejectTimesheetInput = z.object({
  id: z.string().min(1),
});

export const listPendingTimesheetsInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListPendingTimesheetsInput = z.infer<typeof listPendingTimesheetsInput>;

// ── Time Reports ──────────────────────────────────────────────────────────

export const myLoggedHoursInput = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type MyLoggedHoursInput = z.infer<typeof myLoggedHoursInput>;

export const teamLoggedHoursInput = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  projectId: z.string().optional(),
});

export type TeamLoggedHoursInput = z.infer<typeof teamLoggedHoursInput>;

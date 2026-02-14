import { z } from "zod";

export const severityEnum = z.enum(["P1", "P2", "P3", "P4"]);

export type Severity = z.infer<typeof severityEnum>;

export const timelineEntrySchema = z.object({
  event: z.string().min(1),
  author: z.string().optional(),
});

export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

export const communicationEntrySchema = z.object({
  channel: z.string().min(1),
  message: z.string().min(1),
});

export type CommunicationEntry = z.infer<typeof communicationEntrySchema>;

export const createIncidentInput = z.object({
  issueId: z.string().min(1),
  severity: severityEnum,
});

export type CreateIncidentInput = z.infer<typeof createIncidentInput>;

export const updateIncidentInput = z.object({
  id: z.string().min(1),
  severity: severityEnum.optional(),
  statusPageUpdate: z.string().optional(),
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentInput>;

export const addTimelineEntryInput = z.object({
  id: z.string().min(1),
  entry: timelineEntrySchema,
});

export type AddTimelineEntryInput = z.infer<typeof addTimelineEntryInput>;

export const addCommunicationInput = z.object({
  id: z.string().min(1),
  entry: communicationEntrySchema,
});

export type AddCommunicationInput = z.infer<typeof addCommunicationInput>;

export const resolveIncidentInput = z.object({
  id: z.string().min(1),
});

export type ResolveIncidentInput = z.infer<typeof resolveIncidentInput>;

export const listIncidentsInput = z.object({
  severity: severityEnum.optional(),
  resolved: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListIncidentsInput = z.infer<typeof listIncidentsInput>;

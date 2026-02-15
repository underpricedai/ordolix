import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "issue_assigned",
  "comment_added",
  "status_changed",
  "mention",
  "sla_warning",
  "approval_requested",
]);

export type NotificationType = z.infer<typeof notificationTypeEnum>;

export const channelEnum = z.enum(["in_app", "email", "both", "none"]);

export type Channel = z.infer<typeof channelEnum>;

export const createNotificationInput = z.object({
  userId: z.string().min(1),
  type: notificationTypeEnum,
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  issueId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationInput>;

export const listNotificationsInput = z.object({
  isRead: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsInput>;

export const markReadInput = z.object({
  id: z.string().min(1),
});

export type MarkReadInput = z.infer<typeof markReadInput>;

export const markAllReadInput = z.object({});

export type MarkAllReadInput = z.infer<typeof markAllReadInput>;

export const updatePreferenceInput = z.object({
  eventType: notificationTypeEnum,
  channel: channelEnum,
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceInput>;

export const listPreferencesInput = z.object({});

export type ListPreferencesInput = z.infer<typeof listPreferencesInput>;

// ── Notification Scheme Schemas ────────────────────────────────────────────

export const createNotificationSchemeInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export type CreateNotificationSchemeInput = z.infer<typeof createNotificationSchemeInput>;

export const updateNotificationSchemeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type UpdateNotificationSchemeInput = z.infer<typeof updateNotificationSchemeInput>;

export const addNotificationSchemeEntryInput = z.object({
  notificationSchemeId: z.string().min(1),
  event: z.string().min(1),
  recipientType: z.string().min(1),
  recipientId: z.string().nullable().optional(),
  channels: z.array(z.string().min(1)).default(["in_app", "email"]),
});

export type AddNotificationSchemeEntryInput = z.infer<typeof addNotificationSchemeEntryInput>;

export const removeNotificationSchemeEntryInput = z.object({
  id: z.string().min(1),
});

export type RemoveNotificationSchemeEntryInput = z.infer<typeof removeNotificationSchemeEntryInput>;

export const assignNotificationSchemeInput = z.object({
  schemeId: z.string().min(1),
  projectId: z.string().min(1),
});

export type AssignNotificationSchemeInput = z.infer<typeof assignNotificationSchemeInput>;

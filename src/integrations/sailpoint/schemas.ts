/**
 * Zod validation schemas for SailPoint integration inputs.
 *
 * @module integrations/sailpoint/schemas
 */

import { z } from "zod";

/** Schema for configuring SailPoint integration credentials. */
export const configureSailPointSchema = z.object({
  tenantUrl: z.string().url().min(1, "Tenant URL is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  isActive: z.boolean().optional().default(true),
});
export type ConfigureSailPointInput = z.infer<typeof configureSailPointSchema>;

/** Valid target types for a SailPoint mapping. */
export const mappingTargetTypeSchema = z.enum(["group", "projectRole", "organizationRole"]);
export type MappingTargetType = z.infer<typeof mappingTargetTypeSchema>;

/** Valid sync direction values. */
export const syncDirectionSchema = z.enum(["pull", "push", "bidirectional"]);
export type SyncDirection = z.infer<typeof syncDirectionSchema>;

/** Schema for creating a SailPoint group mapping. */
export const createMappingSchema = z.object({
  sailPointGroupId: z.string().min(1, "SailPoint group ID is required"),
  sailPointGroupName: z.string().min(1, "SailPoint group name is required"),
  targetType: mappingTargetTypeSchema,
  targetId: z.string().min(1, "Target ID is required"),
  roleName: z.string().optional(),
  syncDirection: syncDirectionSchema.optional().default("pull"),
});
export type CreateMappingInput = z.infer<typeof createMappingSchema>;

/** Schema for deleting a mapping by ID. */
export const deleteMappingSchema = z.object({
  id: z.string().min(1),
});
export type DeleteMappingInput = z.infer<typeof deleteMappingSchema>;

/** Schema for syncing a single mapping. */
export const syncMappingSchema = z.object({
  mappingId: z.string().min(1),
});
export type SyncMappingInput = z.infer<typeof syncMappingSchema>;

/** Schema for querying sync logs with pagination. */
export const getSyncLogsSchema = z.object({
  mappingId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});
export type GetSyncLogsInput = z.infer<typeof getSyncLogsSchema>;

/** Schema for incoming SailPoint webhook event payload. */
export const sailPointEventSchema = z.object({
  eventType: z.string().min(1),
  userId: z.string().optional(),
  userEmail: z.string().email().optional(),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  action: z.enum(["approved", "revoked"]).optional(),
  timestamp: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type SailPointEventPayload = z.infer<typeof sailPointEventSchema>;

/** Schema for listing SailPoint groups (optional filter). */
export const listSailPointGroupsSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});
export type ListSailPointGroupsInput = z.infer<typeof listSailPointGroupsSchema>;

/**
 * Zod schemas for the Omnea integration.
 *
 * Defines input validation for all Omnea-related tRPC procedures
 * and service functions.
 *
 * @module integrations/omnea/schemas
 */

import { z } from "zod";

// ── Configuration ──────────────────────────────────────────────────────────

/** Input for configuring the Omnea integration */
export const configureOmneaInput = z.object({
  apiUrl: z.string().url().min(1),
  apiKey: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
});
export type ConfigureOmneaInput = z.infer<typeof configureOmneaInput>;

// ── Mapping CRUD ───────────────────────────────────────────────────────────

/** Input for creating a manual Omnea mapping */
export const createOmneaMappingInput = z.object({
  omneaRequestId: z.string().min(1),
  procurementRequestId: z.string().optional(),
  licenseId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});
export type CreateOmneaMappingInput = z.infer<typeof createOmneaMappingInput>;

/** Input for listing Omnea mappings with optional filters */
export const listOmneaMappingsInput = z.object({
  status: z.enum(["pending", "synced", "error", "deleted"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});
export type ListOmneaMappingsInput = z.infer<typeof listOmneaMappingsInput>;

/** Input for getting a single mapping by ID */
export const getOmneaMappingInput = z.object({
  id: z.string().min(1),
});
export type GetOmneaMappingInput = z.infer<typeof getOmneaMappingInput>;

/** Input for deleting a mapping by ID */
export const deleteOmneaMappingInput = z.object({
  id: z.string().min(1),
});
export type DeleteOmneaMappingInput = z.infer<typeof deleteOmneaMappingInput>;

// ── Sync Operations ────────────────────────────────────────────────────────

/** Input for syncing a specific procurement request to Omnea */
export const syncProcurementRequestInput = z.object({
  procurementRequestId: z.string().min(1),
});
export type SyncProcurementRequestInput = z.infer<typeof syncProcurementRequestInput>;

/** Input for pulling license data from Omnea */
export const syncLicenseFromOmneaInput = z.object({
  omneaRequestId: z.string().min(1),
});
export type SyncLicenseFromOmneaInput = z.infer<typeof syncLicenseFromOmneaInput>;

// ── Webhook ────────────────────────────────────────────────────────────────

/** Shape of an incoming Omnea webhook payload */
export const omneaWebhookPayload = z.object({
  event: z.string().min(1),
  requestId: z.string().min(1),
  status: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  timestamp: z.string().optional(),
});
export type OmneaWebhookPayload = z.infer<typeof omneaWebhookPayload>;

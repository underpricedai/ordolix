/**
 * Omnea integration service.
 *
 * Manages Omnea API client creation, procurement request syncing,
 * license data pulling, mapping CRUD, and webhook processing for
 * the Omnea software procurement management platform.
 *
 * @module integrations/omnea/omnea-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, IntegrationError, ValidationError } from "@/server/lib/errors";
import {
  getIntegrationConfig,
  saveIntegrationConfig,
} from "@/integrations/config";
import type {
  ConfigureOmneaInput,
  CreateOmneaMappingInput,
  ListOmneaMappingsInput,
  OmneaWebhookPayload,
} from "./schemas";

const PROVIDER = "omnea" as const;

// ── Omnea API Client ───────────────────────────────────────────────────────

/** Configuration shape for the Omnea HTTP client */
export interface OmneaClientConfig {
  apiUrl: string;
  apiKey: string;
}

/** Response shape from the Omnea API */
export interface OmneaApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

/** Omnea request data as returned from their API */
export interface OmneaRequest {
  id: string;
  title: string;
  status: string;
  vendor?: string;
  licenseType?: string;
  totalCost?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Creates an HTTP client configured to talk to the Omnea API.
 *
 * @param config - Omnea API URL and authentication token
 * @returns Object with request method for making Omnea API calls
 */
export function createOmneaClient(config: OmneaClientConfig) {
  const baseUrl = config.apiUrl.replace(/\/$/, "");

  /**
   * Execute an authenticated request against the Omnea API.
   *
   * @param path - API path (e.g., "/api/v1/requests")
   * @param options - Additional fetch options
   * @returns Parsed JSON response
   * @throws IntegrationError on non-2xx responses
   */
  async function request<T>(path: string, options: RequestInit = {}): Promise<OmneaApiResponse<T>> {
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new IntegrationError("Omnea", `API request failed: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        body,
      });
    }

    return response.json() as Promise<OmneaApiResponse<T>>;
  }

  return {
    /**
     * Get a list of all procurement requests from Omnea.
     *
     * @returns Array of Omnea requests
     */
    async listRequests(): Promise<OmneaRequest[]> {
      const result = await request<OmneaRequest[]>("/api/v1/requests");
      return result.data;
    },

    /**
     * Get a single procurement request from Omnea by ID.
     *
     * @param requestId - The Omnea request ID
     * @returns The Omnea request data
     */
    async getRequest(requestId: string): Promise<OmneaRequest> {
      const result = await request<OmneaRequest>(`/api/v1/requests/${requestId}`);
      return result.data;
    },

    /**
     * Push a procurement request to Omnea.
     *
     * @param data - The procurement request data to send
     * @returns The created Omnea request
     */
    async createRequest(data: Record<string, unknown>): Promise<OmneaRequest> {
      const result = await request<OmneaRequest>("/api/v1/requests", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return result.data;
    },

    /**
     * Update a procurement request status in Omnea.
     *
     * @param requestId - The Omnea request ID
     * @param data - Updated fields
     * @returns The updated Omnea request
     */
    async updateRequest(requestId: string, data: Record<string, unknown>): Promise<OmneaRequest> {
      const result = await request<OmneaRequest>(`/api/v1/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return result.data;
    },
  };
}

// ── Configuration ──────────────────────────────────────────────────────────

/**
 * Retrieves the Omnea integration configuration for an organization.
 * Returns a sanitized version without sensitive tokens.
 *
 * @param db - Prisma client
 * @param organizationId - The organization to query
 * @returns Sanitized config or null if not configured
 */
export async function getOmneaConfig(db: PrismaClient, organizationId: string) {
  const config = await getIntegrationConfig(db, organizationId, PROVIDER);
  if (!config) return null;

  return {
    id: config.id,
    isActive: config.isActive,
    apiUrl: (config.config as Record<string, unknown>).apiUrl as string | undefined,
    webhookUrl: (config.config as Record<string, unknown>).webhookUrl as string | undefined,
    hasApiKey: !!config.tokens?.accessToken,
  };
}

/**
 * Saves or updates the Omnea integration configuration.
 *
 * @param db - Prisma client
 * @param organizationId - The organization to configure
 * @param input - Configuration data including API URL and key
 * @returns The saved config record ID
 */
export async function configureOmnea(
  db: PrismaClient,
  organizationId: string,
  input: ConfigureOmneaInput,
) {
  return saveIntegrationConfig(
    db,
    organizationId,
    PROVIDER,
    {
      apiUrl: input.apiUrl,
      webhookUrl: input.webhookUrl,
    },
    {
      accessToken: input.apiKey,
    },
  );
}

/**
 * Resolves the Omnea client from stored integration config.
 * Throws if integration is not configured or not active.
 *
 * @param db - Prisma client
 * @param organizationId - The organization to resolve config for
 * @returns Configured Omnea client
 * @throws IntegrationError if not configured
 */
async function resolveClient(db: PrismaClient, organizationId: string) {
  const config = await getIntegrationConfig(db, organizationId, PROVIDER);

  if (!config || !config.isActive) {
    throw new IntegrationError("Omnea", "Integration is not configured or not active");
  }

  const apiUrl = (config.config as Record<string, unknown>).apiUrl as string | undefined;
  const apiKey = config.tokens?.accessToken;

  if (!apiUrl || !apiKey) {
    throw new IntegrationError("Omnea", "Missing API URL or API key in configuration");
  }

  return createOmneaClient({ apiUrl, apiKey });
}

// ── Sync Operations ────────────────────────────────────────────────────────

/**
 * Pushes a procurement request to Omnea and creates a mapping.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param procurementRequestId - The local procurement request ID to sync
 * @returns The created or updated OmneaMapping
 * @throws NotFoundError if procurement request not found
 * @throws IntegrationError if Omnea API call fails
 */
export async function syncProcurementRequest(
  db: PrismaClient,
  organizationId: string,
  procurementRequestId: string,
) {
  // Verify the procurement request exists
  const procRequest = await db.procurementRequest.findFirst({
    where: { id: procurementRequestId, organizationId },
  });

  if (!procRequest) {
    throw new NotFoundError("ProcurementRequest", procurementRequestId);
  }

  const client = await resolveClient(db, organizationId);

  // Push to Omnea
  const omneaRequest = await client.createRequest({
    title: procRequest.title,
    description: procRequest.description,
    estimatedCost: procRequest.estimatedCost,
    quantity: procRequest.quantity,
    status: procRequest.status,
    requestNumber: procRequest.requestNumber,
  });

  // Create or update mapping
  const mapping = await db.omneaMapping.upsert({
    where: {
      organizationId_omneaRequestId: {
        organizationId,
        omneaRequestId: omneaRequest.id,
      },
    },
    create: {
      organizationId,
      omneaRequestId: omneaRequest.id,
      procurementRequestId: procurementRequestId,
      status: "synced",
      lastSyncAt: new Date(),
      metadata: {
        title: omneaRequest.title,
        omneaStatus: omneaRequest.status,
        syncDirection: "push",
      },
    },
    update: {
      status: "synced",
      lastSyncAt: new Date(),
      metadata: {
        title: omneaRequest.title,
        omneaStatus: omneaRequest.status,
        syncDirection: "push",
      },
    },
  });

  return mapping;
}

/**
 * Pulls license data from Omnea and updates the local license model.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param omneaRequestId - The Omnea request ID to pull license data from
 * @returns The updated OmneaMapping
 * @throws IntegrationError if Omnea API call fails
 */
export async function syncLicenseFromOmnea(
  db: PrismaClient,
  organizationId: string,
  omneaRequestId: string,
) {
  const client = await resolveClient(db, organizationId);
  const omneaRequest = await client.getRequest(omneaRequestId);

  // Find or create the mapping
  let mapping = await db.omneaMapping.findUnique({
    where: {
      organizationId_omneaRequestId: {
        organizationId,
        omneaRequestId,
      },
    },
  });

  if (!mapping) {
    mapping = await db.omneaMapping.create({
      data: {
        organizationId,
        omneaRequestId,
        status: "synced",
        lastSyncAt: new Date(),
        metadata: {
          title: omneaRequest.title,
          omneaStatus: omneaRequest.status,
          syncDirection: "pull",
        },
      },
    });
  } else {
    mapping = await db.omneaMapping.update({
      where: { id: mapping.id },
      data: {
        status: "synced",
        lastSyncAt: new Date(),
        metadata: {
          title: omneaRequest.title,
          omneaStatus: omneaRequest.status,
          vendor: omneaRequest.vendor,
          licenseType: omneaRequest.licenseType,
          totalCost: omneaRequest.totalCost,
          syncDirection: "pull",
        },
      },
    });
  }

  return mapping;
}

// ── Mapping CRUD ───────────────────────────────────────────────────────────

/**
 * Lists synced Omnea mappings with optional filters and pagination.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Optional status, search, and pagination filters
 * @returns Object with items array, total count, and nextCursor
 */
export async function listOmneaRequests(
  db: PrismaClient,
  organizationId: string,
  input?: ListOmneaMappingsInput,
) {
  const where: Record<string, unknown> = {
    organizationId,
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.search
      ? { omneaRequestId: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const limit = input?.limit ?? 50;

  const [items, total] = await Promise.all([
    db.omneaMapping.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(input?.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.omneaMapping.count({ where }),
  ]);

  const nextCursor = items.length > 0 ? items[items.length - 1]?.id ?? null : null;

  return { items, total, nextCursor };
}

/**
 * Gets a single Omnea mapping by ID.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param id - Mapping record ID
 * @returns The mapping record
 * @throws NotFoundError if mapping not found
 */
export async function getOmneaMapping(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const mapping = await db.omneaMapping.findFirst({
    where: { id, organizationId },
  });

  if (!mapping) {
    throw new NotFoundError("OmneaMapping", id);
  }

  return mapping;
}

/**
 * Manually creates a mapping between an Omnea request and a local
 * procurement request or license.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Mapping creation data
 * @returns The created mapping
 * @throws ValidationError if neither procurementRequestId nor licenseId is provided
 */
export async function createOmneaMapping(
  db: PrismaClient,
  organizationId: string,
  input: CreateOmneaMappingInput,
) {
  if (!input.procurementRequestId && !input.licenseId) {
    throw new ValidationError(
      "At least one of procurementRequestId or licenseId must be provided",
    );
  }

  // Validate the procurement request exists if provided
  if (input.procurementRequestId) {
    const procRequest = await db.procurementRequest.findFirst({
      where: { id: input.procurementRequestId, organizationId },
    });
    if (!procRequest) {
      throw new NotFoundError("ProcurementRequest", input.procurementRequestId);
    }
  }

  // Validate the license exists if provided
  if (input.licenseId) {
    const license = await db.softwareLicense.findFirst({
      where: { id: input.licenseId, organizationId },
    });
    if (!license) {
      throw new NotFoundError("SoftwareLicense", input.licenseId);
    }
  }

  return db.omneaMapping.create({
    data: {
      organizationId,
      omneaRequestId: input.omneaRequestId,
      procurementRequestId: input.procurementRequestId ?? null,
      licenseId: input.licenseId ?? null,
      status: "pending",
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

/**
 * Deletes an Omnea mapping.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param id - Mapping record ID to delete
 * @returns The deleted mapping
 * @throws NotFoundError if mapping not found
 */
export async function deleteOmneaMapping(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const mapping = await db.omneaMapping.findFirst({
    where: { id, organizationId },
  });

  if (!mapping) {
    throw new NotFoundError("OmneaMapping", id);
  }

  return db.omneaMapping.delete({ where: { id } });
}

// ── Full Sync ──────────────────────────────────────────────────────────────

/**
 * Performs a full sync: pulls all pending Omnea requests and updates statuses.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @returns Summary of sync results
 */
export async function syncAll(
  db: PrismaClient,
  organizationId: string,
) {
  const client = await resolveClient(db, organizationId);
  const omneaRequests = await client.listRequests();

  let synced = 0;
  let created = 0;
  let errors = 0;

  for (const omneaReq of omneaRequests) {
    try {
      const existing = await db.omneaMapping.findUnique({
        where: {
          organizationId_omneaRequestId: {
            organizationId,
            omneaRequestId: omneaReq.id,
          },
        },
      });

      if (existing) {
        await db.omneaMapping.update({
          where: { id: existing.id },
          data: {
            status: "synced",
            lastSyncAt: new Date(),
            metadata: {
              title: omneaReq.title,
              omneaStatus: omneaReq.status,
              vendor: omneaReq.vendor,
              totalCost: omneaReq.totalCost,
              syncDirection: "pull",
            },
          },
        });
        synced++;
      } else {
        await db.omneaMapping.create({
          data: {
            organizationId,
            omneaRequestId: omneaReq.id,
            status: "synced",
            lastSyncAt: new Date(),
            metadata: {
              title: omneaReq.title,
              omneaStatus: omneaReq.status,
              vendor: omneaReq.vendor,
              totalCost: omneaReq.totalCost,
              syncDirection: "pull",
            },
          },
        });
        created++;
      }
    } catch {
      errors++;
    }
  }

  return { synced, created, errors, total: omneaRequests.length };
}

// ── Webhook Handler ────────────────────────────────────────────────────────

/**
 * Processes incoming Omnea webhook events.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param payload - The parsed webhook payload
 * @returns Processing result
 */
export async function handleOmneaWebhook(
  db: PrismaClient,
  organizationId: string,
  payload: OmneaWebhookPayload,
) {
  const { event, requestId, status, data } = payload;

  // Find or create mapping for this Omnea request
  const existing = await db.omneaMapping.findUnique({
    where: {
      organizationId_omneaRequestId: {
        organizationId,
        omneaRequestId: requestId,
      },
    },
  });

  switch (event) {
    case "request.approved":
    case "request.rejected":
    case "request.updated": {
      const mappingStatus = event === "request.rejected" ? "error" : "synced";

      if (existing) {
        await db.omneaMapping.update({
          where: { id: existing.id },
          data: {
            status: mappingStatus,
            lastSyncAt: new Date(),
            metadata: {
              ...(typeof existing.metadata === "object" && existing.metadata !== null
                ? existing.metadata as Record<string, unknown>
                : {}),
              omneaStatus: status ?? event,
              lastWebhookEvent: event,
              lastWebhookData: data,
            } as Prisma.InputJsonValue,
          },
        });
      } else {
        await db.omneaMapping.create({
          data: {
            organizationId,
            omneaRequestId: requestId,
            status: mappingStatus,
            lastSyncAt: new Date(),
            metadata: {
              omneaStatus: status ?? event,
              lastWebhookEvent: event,
              lastWebhookData: data,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return { processed: true, event, requestId };
    }

    case "request.deleted": {
      if (existing) {
        await db.omneaMapping.update({
          where: { id: existing.id },
          data: {
            status: "deleted",
            lastSyncAt: new Date(),
            metadata: {
              ...(typeof existing.metadata === "object" && existing.metadata !== null
                ? existing.metadata as Record<string, unknown>
                : {}),
              lastWebhookEvent: event,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return { processed: true, event, requestId };
    }

    default:
      return { processed: false, event, requestId, reason: `Unhandled event: ${event}` };
  }
}

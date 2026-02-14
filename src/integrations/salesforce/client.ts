/**
 * Salesforce REST API client.
 *
 * Provides access to Salesforce records via SOQL queries and CRUD operations.
 * Uses native fetch with no external dependencies.
 *
 * @module integrations/salesforce/client
 */

import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import type {
  SalesforceRecord,
  SalesforceQueryResult,
  SalesforceApiError,
  CreateSalesforceLinkInput,
} from "./types";

const API_VERSION = "v59.0";

/**
 * Salesforce REST API client using native fetch.
 *
 * @example
 * ```ts
 * const sf = new SalesforceClient("https://myorg.my.salesforce.com", "Bearer token");
 * const result = await sf.query("SELECT Id, Subject FROM Case WHERE Status = 'New'");
 * ```
 */
export class SalesforceClient {
  private readonly instanceUrl: string;
  private readonly accessToken: string;

  /**
   * @param instanceUrl - Salesforce instance URL (e.g., "https://yourorg.my.salesforce.com")
   * @param accessToken - OAuth2 access token
   */
  constructor(instanceUrl: string, accessToken: string) {
    this.instanceUrl = instanceUrl.replace(/\/$/, "");
    this.accessToken = accessToken;
  }

  /**
   * Execute an authenticated request against the Salesforce REST API.
   *
   * @param path - API path (e.g., "/sobjects/Case/500xx000000001")
   * @param options - Additional fetch options
   * @returns Parsed JSON response
   * @throws IntegrationError on non-2xx responses
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.instanceUrl}/services/data/${API_VERSION}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errors = (await response.json()) as SalesforceApiError[];
        if (Array.isArray(errors) && errors[0]) {
          errorMessage = `${errors[0].errorCode}: ${errors[0].message}`;
        }
      } catch {
        // Use default error message
      }
      throw new IntegrationError("Salesforce", `API request failed: ${errorMessage}`, {
        url,
        status: response.status,
      });
    }

    // Some responses (204 No Content) don't have a body
    const text = await response.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  /**
   * Execute a SOQL query.
   *
   * @param soql - SOQL query string
   * @returns Query result with records
   *
   * @example
   * ```ts
   * const result = await client.query("SELECT Id, Subject FROM Case LIMIT 10");
   * for (const record of result.records) {
   *   console.log(record.Subject);
   * }
   * ```
   */
  async query<T extends SalesforceRecord = SalesforceRecord>(
    soql: string,
  ): Promise<SalesforceQueryResult<T>> {
    return this.request<SalesforceQueryResult<T>>(
      `/query?q=${encodeURIComponent(soql)}`,
    );
  }

  /**
   * Get a single record by object type and ID.
   *
   * @param objectType - Salesforce object API name (e.g., "Case", "Account")
   * @param id - Record ID (18-char Salesforce ID)
   * @param fields - Optional list of fields to retrieve
   * @returns The record data
   */
  async getRecord<T extends SalesforceRecord = SalesforceRecord>(
    objectType: string,
    id: string,
    fields?: string[],
  ): Promise<T> {
    const fieldParam = fields ? `?fields=${fields.join(",")}` : "";
    return this.request<T>(`/sobjects/${objectType}/${id}${fieldParam}`);
  }

  /**
   * Update fields on an existing record.
   *
   * @param objectType - Salesforce object API name
   * @param id - Record ID
   * @param fields - Key-value pairs of fields to update
   * @throws IntegrationError on update failure
   */
  async updateRecord(
    objectType: string,
    id: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`/sobjects/${objectType}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  }

  /**
   * Create a new record.
   *
   * @param objectType - Salesforce object API name
   * @param fields - Key-value pairs of field values
   * @returns The created record's ID
   */
  async createRecord(
    objectType: string,
    fields: Record<string, unknown>,
  ): Promise<{ id: string; success: boolean }> {
    return this.request<{ id: string; success: boolean }>(
      `/sobjects/${objectType}`,
      {
        method: "POST",
        body: JSON.stringify(fields),
      },
    );
  }

  /**
   * Link a Salesforce record to an Ordolix issue.
   *
   * Creates a SalesforceLink record in the database.
   *
   * @param db - Prisma client
   * @param input - Link creation data
   * @returns The created SalesforceLink record
   */
  async linkRecord(
    db: PrismaClient,
    input: CreateSalesforceLinkInput,
  ) {
    return db.salesforceLink.create({
      data: {
        issueId: input.issueId,
        recordType: input.recordType,
        recordId: input.recordId,
        displayName: input.displayName,
        syncStatus: "active",
        fieldMapping: input.fieldMapping ?? {},
      },
    });
  }
}

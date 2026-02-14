/**
 * Power BI REST API client.
 *
 * Provides access to Power BI workspaces, reports, datasets, and embed tokens
 * through the Power BI REST API using native fetch.
 *
 * @module integrations/powerbi/client
 */

import { IntegrationError } from "@/server/lib/errors";
import type {
  PowerBIReport,
  PowerBIDataset,
  PowerBIGroup,
  PowerBIEmbedToken,
  PowerBICollection,
} from "./types";

const POWERBI_BASE_URL = "https://api.powerbi.com/v1.0/myorg";

/**
 * Power BI REST API client using native fetch.
 *
 * @example
 * ```ts
 * const pbi = new PowerBIClient(accessToken);
 * const reports = await pbi.listReports("workspace-id");
 * const embed = await pbi.getEmbedToken("report-id", "workspace-id");
 * ```
 */
export class PowerBIClient {
  private readonly accessToken: string;

  /**
   * @param accessToken - Azure AD access token with Power BI scopes
   */
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Execute an authenticated request against the Power BI REST API.
   *
   * @param path - API path (e.g., "/groups/{groupId}/reports")
   * @param options - Additional fetch options
   * @returns Parsed JSON response
   * @throws IntegrationError on non-2xx responses
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${POWERBI_BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "Power BI",
        `API request failed: ${response.status} ${response.statusText}`,
        { url, status: response.status, body },
      );
    }

    const text = await response.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  /**
   * Get an embed token for a report.
   *
   * The embed token is used by the Power BI JavaScript SDK to render
   * a report in an iframe on the frontend.
   *
   * @param reportId - Power BI report ID
   * @param groupId - Power BI workspace (group) ID
   * @returns Embed token with expiration
   */
  async getEmbedToken(reportId: string, groupId: string): Promise<PowerBIEmbedToken> {
    return this.request<PowerBIEmbedToken>(
      `/groups/${groupId}/reports/${reportId}/GenerateToken`,
      {
        method: "POST",
        body: JSON.stringify({ accessLevel: "View" }),
      },
    );
  }

  /**
   * List all reports in a workspace.
   *
   * @param groupId - Power BI workspace (group) ID
   * @returns Array of report metadata
   */
  async listReports(groupId: string): Promise<PowerBIReport[]> {
    const result = await this.request<PowerBICollection<PowerBIReport>>(
      `/groups/${groupId}/reports`,
    );
    return result.value;
  }

  /**
   * Get a single report by ID.
   *
   * @param reportId - Power BI report ID
   * @param groupId - Power BI workspace (group) ID
   * @returns Report metadata including embed URL
   */
  async getReport(reportId: string, groupId: string): Promise<PowerBIReport> {
    return this.request<PowerBIReport>(
      `/groups/${groupId}/reports/${reportId}`,
    );
  }

  /**
   * Trigger a refresh of a dataset.
   *
   * @param groupId - Power BI workspace (group) ID
   * @param datasetId - Power BI dataset ID
   */
  async refreshDataset(groupId: string, datasetId: string): Promise<void> {
    await this.request(
      `/groups/${groupId}/datasets/${datasetId}/refreshes`,
      {
        method: "POST",
        body: JSON.stringify({ notifyOption: "NoNotification" }),
      },
    );
  }

  /**
   * List all datasets in a workspace.
   *
   * @param groupId - Power BI workspace (group) ID
   * @returns Array of dataset metadata
   */
  async listDatasets(groupId: string): Promise<PowerBIDataset[]> {
    const result = await this.request<PowerBICollection<PowerBIDataset>>(
      `/groups/${groupId}/datasets`,
    );
    return result.value;
  }

  /**
   * List all workspaces the user has access to.
   *
   * @returns Array of workspace (group) metadata
   */
  async listGroups(): Promise<PowerBIGroup[]> {
    const result = await this.request<PowerBICollection<PowerBIGroup>>("/groups");
    return result.value;
  }
}

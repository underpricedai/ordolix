/**
 * SharePoint client using Microsoft Graph API.
 *
 * Provides access to SharePoint sites, lists, documents, and search
 * through the Microsoft Graph REST API using native fetch.
 *
 * @module integrations/sharepoint/client
 */

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import type {
  SharePointSite,
  SharePointList,
  SharePointListItem,
  SharePointDriveItem,
  SharePointSearchResult,
  SharePointResourceType,
  GraphCollection,
} from "./types";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

/**
 * Microsoft Graph API client for SharePoint operations.
 *
 * @example
 * ```ts
 * const client = new SharePointClient(accessToken);
 * const site = await client.getSite("contoso.sharepoint.com:/sites/engineering");
 * const items = await client.getListItems(site.id, "Tasks");
 * ```
 */
export class SharePointClient {
  private readonly accessToken: string;

  /**
   * @param accessToken - Microsoft Graph API access token
   */
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Execute an authenticated request against the Microsoft Graph API.
   *
   * @param path - Graph API path (e.g., "/sites/{id}")
   * @param options - Additional fetch options
   * @returns Parsed JSON response
   * @throws IntegrationError on non-2xx responses
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${GRAPH_BASE_URL}${path}`;
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
      throw new IntegrationError("SharePoint", `Graph API request failed: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        body,
      });
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get a SharePoint site by ID or path.
   *
   * @param siteId - Site ID or site path (e.g., "contoso.sharepoint.com:/sites/engineering")
   * @returns SharePoint site data
   */
  async getSite(siteId: string): Promise<SharePointSite> {
    return this.request<SharePointSite>(`/sites/${siteId}`);
  }

  /**
   * List all lists in a SharePoint site.
   *
   * @param siteId - The site ID
   * @returns Collection of SharePoint lists
   */
  async getLists(siteId: string): Promise<SharePointList[]> {
    const result = await this.request<GraphCollection<SharePointList>>(
      `/sites/${siteId}/lists`,
    );
    return result.value;
  }

  /**
   * Get items from a SharePoint list.
   *
   * @param siteId - The site ID
   * @param listId - The list ID or name
   * @param top - Maximum number of items to return (default 50)
   * @returns Collection of list items with their fields
   */
  async getListItems(
    siteId: string,
    listId: string,
    top = 50,
  ): Promise<SharePointListItem[]> {
    const result = await this.request<GraphCollection<SharePointListItem>>(
      `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=${top}`,
    );
    return result.value;
  }

  /**
   * Search for documents across SharePoint.
   *
   * Uses the Microsoft Search API to find documents matching a query.
   *
   * @param query - Search query string
   * @param size - Maximum results to return (default 25)
   * @returns Search results with document metadata
   */
  async searchDocuments(
    query: string,
    size = 25,
  ): Promise<SharePointSearchResult> {
    return this.request<SharePointSearchResult>("/search/query", {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            entityTypes: ["driveItem"],
            query: { queryString: query },
            from: 0,
            size,
          },
        ],
      }),
    });
  }

  /**
   * Get files in a site's default document library.
   *
   * @param siteId - The site ID
   * @param folderId - Optional folder ID to list contents of (default is root)
   * @returns Array of drive items (files and folders)
   */
  async getDocuments(
    siteId: string,
    folderId?: string,
  ): Promise<SharePointDriveItem[]> {
    const path = folderId
      ? `/sites/${siteId}/drive/items/${folderId}/children`
      : `/sites/${siteId}/drive/root/children`;
    const result = await this.request<GraphCollection<SharePointDriveItem>>(path);
    return result.value;
  }

  /**
   * Link a SharePoint document to an Ordolix issue.
   *
   * Creates a SharePointLink record in the database.
   *
   * @param db - Prisma client
   * @param issueId - Ordolix issue ID to link the document to
   * @param resourceId - SharePoint resource identifier
   * @param resourceType - Type of resource being linked
   * @param url - Web URL of the SharePoint resource
   * @param title - Display title for the linked resource
   * @param preview - Optional preview metadata
   * @returns The created SharePointLink record
   */
  async linkDocument(
    db: PrismaClient,
    issueId: string,
    resourceId: string,
    resourceType: SharePointResourceType,
    url: string,
    title: string,
    preview?: Record<string, unknown>,
  ) {
    return db.sharePointLink.create({
      data: {
        issueId,
        resourceId,
        resourceType,
        url,
        title,
        preview: (preview ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * TypeScript types for the SharePoint integration.
 *
 * Covers Microsoft Graph API resources, configuration, and link data.
 *
 * @module integrations/sharepoint/types
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** SharePoint integration configuration stored in IntegrationConfig.config */
export interface SharePointConfig {
  /** Azure AD tenant ID */
  tenantId: string;
  /** Azure AD client ID for the app registration */
  clientId: string;
  /** Default SharePoint site ID */
  defaultSiteId?: string;
  /** Whether to enable document search from within Ordolix */
  searchEnabled: boolean;
}

// ── Microsoft Graph API Types ─────────────────────────────────────────────

export interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface SharePointList {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface SharePointListItem {
  id: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  fields: Record<string, unknown>;
  createdBy?: { user: SharePointUser };
  lastModifiedBy?: { user: SharePointUser };
}

export interface SharePointUser {
  id: string;
  displayName: string;
  email?: string;
}

export interface SharePointDriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: { user: SharePointUser };
  lastModifiedBy?: { user: SharePointUser };
}

export interface SharePointSearchResult {
  hitsContainers: Array<{
    total: number;
    moreResultsAvailable: boolean;
    hits: Array<{
      hitId: string;
      rank: number;
      summary: string;
      resource: SharePointDriveItem;
    }>;
  }>;
}

// ── Resource Types ────────────────────────────────────────────────────────

/** Types of SharePoint resources that can be linked to issues */
export type SharePointResourceType = "document" | "list_item" | "page" | "site";

/** A SharePoint resource reference used for linking */
export interface SharePointResource {
  resourceId: string;
  resourceType: SharePointResourceType;
  url: string;
  title: string;
  preview?: {
    thumbnailUrl?: string;
    mimeType?: string;
    size?: number;
    modifiedBy?: string;
    modifiedAt?: string;
  };
}

/** Microsoft Graph API collection response */
export interface GraphCollection<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

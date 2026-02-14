/**
 * TypeScript types for the Power BI integration.
 *
 * Covers REST API responses, embed configuration, and report metadata.
 *
 * @module integrations/powerbi/types
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** Power BI integration configuration stored in IntegrationConfig.config */
export interface PowerBIConfig {
  /** Azure AD tenant ID */
  tenantId: string;
  /** Azure AD client ID for the app registration */
  clientId: string;
  /** Default Power BI workspace (group) ID */
  defaultGroupId?: string;
  /** Whether to enable embedded reports in Ordolix dashboards */
  embedEnabled: boolean;
}

// ── Power BI REST API Types ──────────────────────────────────────────────

export interface PowerBIReport {
  id: string;
  name: string;
  reportType: string;
  webUrl: string;
  embedUrl: string;
  datasetId: string;
  createdDateTime?: string;
  modifiedDateTime?: string;
}

export interface PowerBIDataset {
  id: string;
  name: string;
  webUrl: string;
  isRefreshable: boolean;
  configuredBy?: string;
  createdDate?: string;
}

export interface PowerBIGroup {
  id: string;
  name: string;
  isReadOnly: boolean;
  isOnDedicatedCapacity: boolean;
  type?: string;
}

export interface PowerBIEmbedToken {
  token: string;
  tokenId: string;
  expiration: string;
}

export interface PowerBIRefreshResponse {
  requestId?: string;
}

// ── Embed Configuration ──────────────────────────────────────────────────

/** Configuration needed by the frontend to embed a Power BI report */
export interface EmbedConfig {
  /** Report ID */
  reportId: string;
  /** The embed URL from the Power BI API */
  embedUrl: string;
  /** Embed token for authentication */
  accessToken: string;
  /** Token type (always "Embed" for embed tokens) */
  tokenType: "Embed";
  /** Token expiration ISO datetime */
  expiration: string;
  /** Optional page name to navigate to */
  pageName?: string;
  /** Optional filter to apply to the embedded report */
  filter?: string;
}

/** Report metadata for display in Ordolix */
export interface ReportMetadata {
  id: string;
  name: string;
  reportType: string;
  webUrl: string;
  datasetId: string;
  groupId: string;
  lastRefreshed?: string;
}

/** Power BI API collection response */
export interface PowerBICollection<T> {
  value: T[];
  "@odata.count"?: number;
}

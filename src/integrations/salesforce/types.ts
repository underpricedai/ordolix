/**
 * TypeScript types for the Salesforce integration.
 *
 * Covers API responses, configuration, sync logic, and link data.
 *
 * @module integrations/salesforce/types
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** Salesforce integration configuration stored in IntegrationConfig.config */
export interface SalesforceConfig {
  /** Salesforce instance URL (e.g., "https://yourorg.my.salesforce.com") */
  instanceUrl: string;
  /** Connected App client ID */
  clientId: string;
  /** Default object type for sync (e.g., "Case") */
  defaultObjectType: string;
  /** Field mapping from Ordolix issue fields to Salesforce fields */
  fieldMappings: SalesforceFieldMapping[];
  /** Sync direction */
  syncDirection: SyncDirection;
}

/** Direction of data synchronization */
export type SyncDirection = "ordolix_to_salesforce" | "salesforce_to_ordolix" | "bidirectional";

/** Maps an Ordolix field to a Salesforce field */
export interface SalesforceFieldMapping {
  /** Ordolix issue field name */
  ordolixField: string;
  /** Salesforce object field API name */
  salesforceField: string;
  /** Transformation to apply during sync */
  transform?: "none" | "uppercase" | "lowercase" | "map";
  /** Value mapping for 'map' transform type */
  valueMap?: Record<string, string>;
}

// ── Salesforce API Types ──────────────────────────────────────────────────

/** Generic Salesforce record */
export interface SalesforceRecord {
  Id: string;
  Name?: string;
  attributes: {
    type: string;
    url: string;
  };
  [field: string]: unknown;
}

/** SOQL query result */
export interface SalesforceQueryResult<T = SalesforceRecord> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

/** Salesforce API error response */
export interface SalesforceApiError {
  message: string;
  errorCode: string;
  fields?: string[];
}

/** Salesforce Case record (common sync target) */
export interface SalesforceCase extends SalesforceRecord {
  CaseNumber: string;
  Subject: string;
  Description: string | null;
  Status: string;
  Priority: string;
  Origin: string;
  ContactId: string | null;
  AccountId: string | null;
}

// ── Sync Types ───────────────────────────────────────────────────────────

/** Result of a sync operation */
export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  ordolixIssueId: string;
  salesforceRecordId: string;
  fieldsUpdated: string[];
  errors: string[];
  timestamp: string;
}

/** Input for creating a Salesforce link */
export interface CreateSalesforceLinkInput {
  issueId: string;
  recordType: string;
  recordId: string;
  displayName: string;
  fieldMapping?: Record<string, string>;
}

/**
 * Bidirectional sync logic between Ordolix issues and Salesforce records.
 *
 * Handles mapping fields between the two systems and performing
 * updates in both directions based on field mappings.
 *
 * @module integrations/salesforce/sync
 */

import type { PrismaClient } from "@prisma/client";
import { IntegrationError as _IntegrationError } from "@/server/lib/errors"; // Reserved for sync error handling
import { SalesforceClient } from "./client";
import type {
  SalesforceFieldMapping,
  SalesforceCase,
  SyncResult,
} from "./types";

/**
 * Default field mappings between Ordolix issues and Salesforce Cases.
 */
const DEFAULT_CASE_MAPPINGS: SalesforceFieldMapping[] = [
  { ordolixField: "summary", salesforceField: "Subject" },
  { ordolixField: "description", salesforceField: "Description" },
];

/**
 * Apply a field mapping transform to a value.
 *
 * @param value - The value to transform
 * @param mapping - The field mapping with optional transform
 * @returns Transformed value
 */
function applyTransform(
  value: unknown,
  mapping: SalesforceFieldMapping,
): unknown {
  if (value === null || value === undefined) return value;

  const strValue = String(value);

  switch (mapping.transform) {
    case "uppercase":
      return strValue.toUpperCase();
    case "lowercase":
      return strValue.toLowerCase();
    case "map":
      return mapping.valueMap?.[strValue] ?? strValue;
    default:
      return value;
  }
}

/**
 * Sync an Ordolix issue to a Salesforce Case.
 *
 * Reads the current issue state from the database and updates
 * the corresponding Salesforce Case record based on field mappings.
 *
 * @param db - Prisma client
 * @param organizationId - Organization owning the integration
 * @param issueId - Ordolix issue ID
 * @param caseId - Salesforce Case ID
 * @param client - Salesforce API client
 * @param mappings - Field mappings (defaults to summary/description)
 * @returns Sync result with details of what was updated
 *
 * @example
 * ```ts
 * const result = await syncIssueToCase(db, "org-1", "issue-abc", "500xx000001", sfClient);
 * console.log(`Updated ${result.fieldsUpdated.length} fields`);
 * ```
 */
export async function syncIssueToCase(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
  caseId: string,
  client: SalesforceClient,
  mappings: SalesforceFieldMapping[] = DEFAULT_CASE_MAPPINGS,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    direction: "ordolix_to_salesforce",
    ordolixIssueId: issueId,
    salesforceRecordId: caseId,
    fieldsUpdated: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Fetch the Ordolix issue
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId },
    select: {
      id: true,
      summary: true,
      description: true,
      status: { select: { name: true, category: true } },
      priority: { select: { name: true } },
      labels: true,
      customFieldValues: true,
    },
  });

  if (!issue) {
    result.errors.push(`Issue ${issueId} not found`);
    return result;
  }

  // Build update payload from field mappings
  const updates: Record<string, unknown> = {};
  const issueData: Record<string, unknown> = {
    summary: issue.summary,
    description: issue.description,
    status: issue.status.name,
    statusCategory: issue.status.category,
    priority: issue.priority.name,
    labels: issue.labels.join(", "),
    ...(issue.customFieldValues as Record<string, unknown>),
  };

  for (const mapping of mappings) {
    const value = issueData[mapping.ordolixField];
    if (value !== undefined) {
      updates[mapping.salesforceField] = applyTransform(value, mapping);
      result.fieldsUpdated.push(mapping.salesforceField);
    }
  }

  if (Object.keys(updates).length === 0) {
    result.success = true;
    return result;
  }

  try {
    await client.updateRecord("Case", caseId, updates);
    result.success = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(message);
  }

  // Update sync status on the link
  await db.salesforceLink.updateMany({
    where: { issueId, recordId: caseId },
    data: {
      syncStatus: result.success ? "active" : "error",
      updatedAt: new Date(),
    },
  });

  return result;
}

/**
 * Sync a Salesforce Case to an Ordolix issue.
 *
 * Reads the current Case state from Salesforce and updates
 * the corresponding Ordolix issue based on reverse field mappings.
 *
 * @param db - Prisma client
 * @param organizationId - Organization owning the integration
 * @param caseId - Salesforce Case ID
 * @param issueId - Ordolix issue ID
 * @param client - Salesforce API client
 * @param mappings - Field mappings (defaults to summary/description)
 * @returns Sync result with details of what was updated
 */
export async function syncCaseToIssue(
  db: PrismaClient,
  organizationId: string,
  caseId: string,
  issueId: string,
  client: SalesforceClient,
  mappings: SalesforceFieldMapping[] = DEFAULT_CASE_MAPPINGS,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    direction: "salesforce_to_ordolix",
    ordolixIssueId: issueId,
    salesforceRecordId: caseId,
    fieldsUpdated: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Fetch the Salesforce Case
  let sfCase: SalesforceCase;
  try {
    const fields = mappings.map((m) => m.salesforceField);
    sfCase = await client.getRecord<SalesforceCase>("Case", caseId, fields);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Failed to fetch Salesforce Case: ${message}`);
    return result;
  }

  // Build issue update payload from reverse field mappings
  const issueUpdates: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sfValue = sfCase[mapping.salesforceField];
    if (sfValue !== undefined) {
      const transformed = applyTransform(sfValue, mapping);

      // Only map known Ordolix issue fields
      switch (mapping.ordolixField) {
        case "summary":
          issueUpdates.summary = transformed;
          break;
        case "description":
          issueUpdates.description = transformed;
          break;
        default:
          // Store unmapped fields in customFieldValues
          break;
      }

      result.fieldsUpdated.push(mapping.ordolixField);
    }
  }

  if (Object.keys(issueUpdates).length === 0) {
    result.success = true;
    return result;
  }

  try {
    await db.issue.updateMany({
      where: { id: issueId, organizationId },
      data: {
        ...issueUpdates,
        updatedAt: new Date(),
      },
    });
    result.success = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(message);
  }

  // Update sync status on the link
  await db.salesforceLink.updateMany({
    where: { issueId, recordId: caseId },
    data: {
      syncStatus: result.success ? "active" : "error",
      updatedAt: new Date(),
    },
  });

  return result;
}

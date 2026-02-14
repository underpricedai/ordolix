/**
 * Power BI embed configuration helper.
 *
 * Generates the configuration object needed by the frontend to render
 * embedded Power BI reports using the Power BI JavaScript SDK.
 *
 * @module integrations/powerbi/embed
 */

import { IntegrationError } from "@/server/lib/errors";
import { PowerBIClient } from "./client";
import type { EmbedConfig, ReportMetadata } from "./types";

/**
 * Generate a complete embed configuration for a Power BI report.
 *
 * Fetches the report metadata and generates an embed token, then
 * combines them into a configuration object that the frontend can
 * pass directly to the Power BI JavaScript SDK.
 *
 * @param accessToken - Azure AD access token
 * @param reportId - Power BI report ID
 * @param groupId - Power BI workspace (group) ID
 * @param options - Optional embed customization
 * @returns Complete embed configuration for the frontend
 *
 * @example
 * ```ts
 * const config = await generateEmbedConfig(token, "report-id", "group-id");
 * // Pass config to frontend component:
 * // <PowerBIEmbed embedConfig={config} />
 * ```
 */
export async function generateEmbedConfig(
  accessToken: string,
  reportId: string,
  groupId: string,
  options?: {
    pageName?: string;
    filter?: string;
  },
): Promise<EmbedConfig> {
  const client = new PowerBIClient(accessToken);

  // Fetch report metadata and embed token in parallel
  const [report, embedToken] = await Promise.all([
    client.getReport(reportId, groupId),
    client.getEmbedToken(reportId, groupId),
  ]);

  if (!report.embedUrl) {
    throw new IntegrationError(
      "Power BI",
      "Report does not have an embed URL. Ensure the report is published to a workspace.",
      { reportId, groupId },
    );
  }

  return {
    reportId: report.id,
    embedUrl: report.embedUrl,
    accessToken: embedToken.token,
    tokenType: "Embed",
    expiration: embedToken.expiration,
    pageName: options?.pageName,
    filter: options?.filter,
  };
}

/**
 * Build report metadata from a Power BI report object.
 *
 * Normalizes the API response into a simpler metadata object
 * for display in Ordolix dashboards and listings.
 *
 * @param report - Raw Power BI report from the API
 * @param groupId - The workspace ID the report belongs to
 * @param lastRefreshed - Optional last refresh timestamp
 * @returns Normalized report metadata
 */
export function buildReportMetadata(
  report: { id: string; name: string; reportType: string; webUrl: string; datasetId: string },
  groupId: string,
  lastRefreshed?: string,
): ReportMetadata {
  return {
    id: report.id,
    name: report.name,
    reportType: report.reportType,
    webUrl: report.webUrl,
    datasetId: report.datasetId,
    groupId,
    lastRefreshed,
  };
}

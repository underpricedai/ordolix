/**
 * Email template for SLA breach warning notifications.
 *
 * Sent when an SLA is approaching its breach deadline, alerting the assignee
 * and watchers to take action before the SLA is violated.
 *
 * @module sla-warning
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

export interface SlaWarningProps {
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue summary/title */
  issueSummary: string;
  /** Name of the SLA metric (e.g., "First Response Time") */
  slaName: string;
  /** Human-readable breach deadline (e.g., "in 30 minutes", "2026-02-14 15:00 UTC") */
  breachTime: string;
  /** Direct URL to the issue */
  issueUrl: string;
}

/**
 * Generates an HTML email for SLA breach warning notifications.
 *
 * @param props - SLA warning details
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = slaWarning({
 *   issueKey: "PROJ-42",
 *   issueSummary: "Customer cannot access dashboard",
 *   slaName: "First Response Time",
 *   breachTime: "in 30 minutes",
 *   issueUrl: "https://ordolix.dev/proj/issues/PROJ-42",
 * });
 * ```
 */
export function slaWarning(props: SlaWarningProps): string {
  const { issueKey, issueSummary, slaName, breachTime, issueUrl } = props;

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: #ffebe6; border-left: 3px solid #de350b; border-radius: 0 4px 4px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 13px; color: #bf2600; font-weight: 600;">
            SLA breach imminent
          </p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #172b4d;">
            The <strong>${escapeHtml(slaName)}</strong> SLA for this issue will breach <strong>${escapeHtml(breachTime)}</strong>.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #172b4d;">
      Please take action on
      <strong style="color: #0052CC;">${escapeHtml(issueKey)}</strong>:
      ${escapeHtml(issueSummary)} before the SLA deadline.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f4f5f7; border-radius: 4px;">
      <tr>
        <td style="padding: 12px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">SLA</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #172b4d;">${escapeHtml(slaName)}</p>
              </td>
              <td style="text-align: right;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">Breaches</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #de350b; font-weight: 600;">${escapeHtml(breachTime)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton("View Issue", issueUrl)}
  `;

  return baseLayout({
    title: `SLA breach imminent for ${issueKey}`,
    body,
  });
}

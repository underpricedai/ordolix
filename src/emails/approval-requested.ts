/**
 * Email template for approval request notifications.
 *
 * Sent when a user requests approval for an issue, notifying the designated
 * approvers with a direct link to the approval action.
 *
 * @module approval-requested
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

export interface ApprovalRequestedProps {
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue summary/title */
  issueSummary: string;
  /** Display name of the person requesting approval */
  requesterName: string;
  /** Direct URL to the approval page */
  approvalUrl: string;
}

/**
 * Generates an HTML email for approval request notifications.
 *
 * @param props - Approval request details
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = approvalRequested({
 *   issueKey: "PROJ-42",
 *   issueSummary: "Deploy v2.1 to production",
 *   requesterName: "Alice",
 *   approvalUrl: "https://ordolix.dev/proj/issues/PROJ-42/approvals",
 * });
 * ```
 */
export function approvalRequested(props: ApprovalRequestedProps): string {
  const { issueKey, issueSummary, requesterName, approvalUrl } = props;

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #172b4d;">
      <strong>${escapeHtml(requesterName)}</strong> is requesting your approval for
      <strong style="color: #0052CC;">${escapeHtml(issueKey)}</strong>:
      ${escapeHtml(issueSummary)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #fffae6; border-left: 3px solid #ff991f; border-radius: 0 4px 4px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 13px; color: #172b4d;">
            <strong>Action required:</strong> Please review and approve or reject this request.
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f4f5f7; border-radius: 4px;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">Issue</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #172b4d; font-weight: 600;">${escapeHtml(issueKey)}: ${escapeHtml(issueSummary)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton("Review Approval", approvalUrl)}
  `;

  return baseLayout({
    title: `Approval requested for ${issueKey}`,
    body,
  });
}

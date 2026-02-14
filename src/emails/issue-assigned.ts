/**
 * Email template for issue assignment notifications.
 *
 * Sent when a user is assigned to an issue, informing them of the assignment
 * and providing a direct link to the issue.
 *
 * @module issue-assigned
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

export interface IssueAssignedProps {
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue summary/title */
  issueSummary: string;
  /** Display name of the assignee */
  assigneeName: string;
  /** Display name of the person who made the assignment */
  assignerName: string;
  /** Direct URL to the issue */
  issueUrl: string;
}

/**
 * Generates an HTML email for issue assignment notifications.
 *
 * @param props - Issue assignment details
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = issueAssigned({
 *   issueKey: "PROJ-42",
 *   issueSummary: "Fix login page error",
 *   assigneeName: "Jane",
 *   assignerName: "Bob",
 *   issueUrl: "https://ordolix.dev/proj/issues/PROJ-42",
 * });
 * ```
 */
export function issueAssigned(props: IssueAssignedProps): string {
  const { issueKey, issueSummary, assigneeName, assignerName, issueUrl } = props;

  const body = `
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #172b4d;">
      Hi ${escapeHtml(assigneeName)},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #172b4d;">
      <strong>${escapeHtml(assignerName)}</strong> assigned you to
      <strong style="color: #0052CC;">${escapeHtml(issueKey)}</strong>:
      ${escapeHtml(issueSummary)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f4f5f7; border-radius: 4px;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">Issue</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #172b4d; font-weight: 600;">${escapeHtml(issueKey)}: ${escapeHtml(issueSummary)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton("View Issue", issueUrl)}
  `;

  return baseLayout({
    title: `You've been assigned to ${issueKey}: ${issueSummary}`,
    body,
  });
}

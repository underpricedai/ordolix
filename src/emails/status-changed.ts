/**
 * Email template for issue status transition notifications.
 *
 * Sent when an issue is transitioned from one status to another,
 * notifying watchers and assignees of the change.
 *
 * @module status-changed
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

export interface StatusChangedProps {
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue summary/title */
  issueSummary: string;
  /** Name of the previous status */
  fromStatus: string;
  /** Name of the new status */
  toStatus: string;
  /** Display name of the person who made the transition */
  changedByName: string;
  /** Direct URL to the issue */
  issueUrl: string;
}

/**
 * Generates an HTML email for issue status change notifications.
 *
 * @param props - Status change details
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = statusChanged({
 *   issueKey: "PROJ-42",
 *   issueSummary: "Fix login page error",
 *   fromStatus: "To Do",
 *   toStatus: "In Progress",
 *   changedByName: "Bob",
 *   issueUrl: "https://ordolix.dev/proj/issues/PROJ-42",
 * });
 * ```
 */
export function statusChanged(props: StatusChangedProps): string {
  const { issueKey, issueSummary, fromStatus, toStatus, changedByName, issueUrl } = props;

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #172b4d;">
      <strong>${escapeHtml(changedByName)}</strong> updated the status of
      <strong style="color: #0052CC;">${escapeHtml(issueKey)}</strong>:
      ${escapeHtml(issueSummary)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f4f5f7; border-radius: 4px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="45%" style="text-align: center; vertical-align: middle;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
                <span style="display: inline-block; padding: 4px 12px; background-color: #dfe1e6; border-radius: 3px; font-size: 13px; font-weight: 600; color: #42526e;">
                  ${escapeHtml(fromStatus)}
                </span>
              </td>
              <td width="10%" style="text-align: center; vertical-align: middle; font-size: 18px; color: #6b778c;">
                &rarr;
              </td>
              <td width="45%" style="text-align: center; vertical-align: middle;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;">To</p>
                <span style="display: inline-block; padding: 4px 12px; background-color: #0052CC; border-radius: 3px; font-size: 13px; font-weight: 600; color: #ffffff;">
                  ${escapeHtml(toStatus)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton("View Issue", issueUrl)}
  `;

  return baseLayout({
    title: `${issueKey} moved from ${fromStatus} to ${toStatus}`,
    body,
  });
}

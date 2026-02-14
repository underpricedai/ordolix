/**
 * Email template for new comment notifications.
 *
 * Sent when a comment is added to an issue that the recipient is watching
 * or assigned to.
 *
 * @module comment-added
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

export interface CommentAddedProps {
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue summary/title */
  issueSummary: string;
  /** Display name of the commenter */
  commenterName: string;
  /** Comment body text (plain text, not HTML) */
  commentBody: string;
  /** Direct URL to the issue */
  issueUrl: string;
}

/**
 * Generates an HTML email for new comment notifications.
 *
 * @param props - Comment notification details
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = commentAdded({
 *   issueKey: "PROJ-42",
 *   issueSummary: "Fix login page error",
 *   commenterName: "Bob",
 *   commentBody: "I think we should also check the session timeout.",
 *   issueUrl: "https://ordolix.dev/proj/issues/PROJ-42",
 * });
 * ```
 */
export function commentAdded(props: CommentAddedProps): string {
  const { issueKey, issueSummary, commenterName, commentBody, issueUrl } = props;

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #172b4d;">
      <strong>${escapeHtml(commenterName)}</strong> commented on
      <strong style="color: #0052CC;">${escapeHtml(issueKey)}</strong>:
      ${escapeHtml(issueSummary)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; border-left: 3px solid #0052CC; background-color: #f4f5f7; border-radius: 0 4px 4px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 14px; color: #172b4d; white-space: pre-wrap;">${escapeHtml(commentBody)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton("View Issue", issueUrl)}
  `;

  return baseLayout({
    title: `New comment on ${issueKey}`,
    body,
  });
}

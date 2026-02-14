/**
 * Email templates for Ordolix notifications.
 *
 * All templates generate complete HTML email strings with inline styles,
 * responsive design, and Ordolix branding.
 *
 * @module emails
 */

export { baseLayout, ctaButton, escapeHtml } from "./base-layout";
export type { BaseLayoutProps } from "./base-layout";

export { issueAssigned } from "./issue-assigned";
export type { IssueAssignedProps } from "./issue-assigned";

export { commentAdded } from "./comment-added";
export type { CommentAddedProps } from "./comment-added";

export { statusChanged } from "./status-changed";
export type { StatusChangedProps } from "./status-changed";

export { approvalRequested } from "./approval-requested";
export type { ApprovalRequestedProps } from "./approval-requested";

export { slaWarning } from "./sla-warning";
export type { SlaWarningProps } from "./sla-warning";

export { digest } from "./digest";
export type { DigestProps, DigestItem } from "./digest";

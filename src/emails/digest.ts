/**
 * Email template for daily digest notifications.
 *
 * Aggregates all activity for a user into a single daily email summary,
 * organized by activity type with timestamps.
 *
 * @module digest
 */

import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

/** Individual activity item in the digest */
export interface DigestItem {
  /** Type of activity (e.g., "assigned", "commented", "transitioned", "mentioned") */
  type: string;
  /** Issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** Issue or activity summary text */
  summary: string;
  /** ISO 8601 timestamp of the activity */
  timestamp: string;
}

export interface DigestProps {
  /** Display name of the recipient */
  userName: string;
  /** List of activity items to include in the digest */
  items: DigestItem[];
}

/** Maps activity types to human-readable labels */
const TYPE_LABELS: Record<string, string> = {
  assigned: "Assigned",
  commented: "Comment",
  transitioned: "Status Changed",
  mentioned: "Mentioned",
  created: "Created",
  updated: "Updated",
  approval_requested: "Approval Requested",
  sla_warning: "SLA Warning",
};

/**
 * Generates an HTML email for the daily digest notification.
 *
 * @param props - Digest properties including user name and activity items
 * @returns Complete HTML email string
 *
 * @example
 * ```ts
 * const html = digest({
 *   userName: "Alice",
 *   items: [
 *     { type: "assigned", issueKey: "PROJ-1", summary: "Fix login", timestamp: "2026-02-14T10:00:00Z" },
 *     { type: "commented", issueKey: "PROJ-2", summary: "New comment by Bob", timestamp: "2026-02-14T11:30:00Z" },
 *   ],
 * });
 * ```
 */
export function digest(props: DigestProps): string {
  const { userName, items } = props;

  if (items.length === 0) {
    const body = `
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #172b4d;">
        Hi ${escapeHtml(userName)},
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b778c;">
        No activity to report for today. Have a great day!
      </p>
    `;

    return baseLayout({
      title: "Your Daily Digest",
      body,
    });
  }

  const itemRows = items
    .map((item) => {
      const typeLabel = TYPE_LABELS[item.type] ?? item.type;
      const time = formatTime(item.timestamp);

      return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #ebecf0; vertical-align: top;">
          <span style="display: inline-block; padding: 2px 8px; background-color: #deebff; border-radius: 3px; font-size: 11px; font-weight: 600; color: #0052CC; text-transform: uppercase; letter-spacing: 0.3px;">
            ${escapeHtml(typeLabel)}
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #ebecf0; vertical-align: top;">
          <p style="margin: 0; font-size: 13px; color: #172b4d;">
            <strong style="color: #0052CC;">${escapeHtml(item.issueKey)}</strong>
            ${escapeHtml(item.summary)}
          </p>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #ebecf0; vertical-align: top; white-space: nowrap;">
          <span style="font-size: 12px; color: #6b778c;">${escapeHtml(time)}</span>
        </td>
      </tr>`;
    })
    .join("");

  const body = `
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #172b4d;">
      Hi ${escapeHtml(userName)},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #172b4d;">
      Here is your daily summary with <strong>${items.length}</strong> update${items.length === 1 ? "" : "s"}:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: #ffffff; border: 1px solid #dfe1e6; border-radius: 4px;">
      <tr style="background-color: #f4f5f7;">
        <td style="padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #dfe1e6;">Type</td>
        <td style="padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #dfe1e6;">Details</td>
        <td style="padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #dfe1e6;">Time</td>
      </tr>
      ${itemRows}
    </table>
    ${ctaButton("Open Ordolix", "https://ordolix.dev")}
  `;

  return baseLayout({
    title: "Your Daily Digest",
    body,
  });
}

/**
 * Formats an ISO timestamp into a short time string (HH:MM).
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted time string
 */
function formatTime(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoTimestamp;
  }
}

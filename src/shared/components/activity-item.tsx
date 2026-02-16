/**
 * ActivityItem component for rendering a single activity feed entry.
 *
 * @description Displays user avatar, action description, entity link,
 * and relative timestamp in a horizontal row. Designed for use in
 * organization-wide activity feeds and issue-specific activity tabs.
 *
 * @module activity-item
 */
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { cn } from "@/shared/lib/utils";

/**
 * Props for the ActivityItem component.
 */
export interface ActivityItemProps {
  /** The action performed (e.g. "CREATED", "UPDATED", "DELETED") */
  action: string;
  /** The type of entity (e.g. "Issue", "Project", "Workflow") */
  entityType: string;
  /** The ID or key of the entity */
  entityId: string;
  /** Display name of the user who performed the action */
  userName: string | null;
  /** URL for the user's avatar image */
  userImage?: string | null;
  /** When the action occurred */
  timestamp: Date | string;
  /** Optional additional details (diff, etc.) */
  details?: Record<string, unknown>;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Extracts initials from a user display name.
 *
 * @param name - User's full name
 * @returns Up to 2 uppercase initials, or "?" if name is null
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Formats a date as a relative timestamp string.
 *
 * @param date - The date to format
 * @returns A human-readable relative timestamp (e.g. "5m ago", "2h ago")
 */
function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Formats an action string into a human-readable verb.
 *
 * @param action - The raw action string (e.g. "CREATED", "UPDATED")
 * @returns A lowercase past-tense verb
 */
function formatAction(action: string): string {
  const normalized = action.toUpperCase();
  switch (normalized) {
    case "CREATED":
      return "created";
    case "UPDATED":
      return "updated";
    case "DELETED":
      return "deleted";
    case "TRANSITIONED":
      return "transitioned";
    case "ASSIGNED":
      return "assigned";
    case "COMMENTED":
      return "commented on";
    default:
      return action.toLowerCase();
  }
}

/**
 * Resolves a link path for an entity based on its type and ID.
 *
 * @param entityType - The type of entity
 * @param entityId - The entity ID or key
 * @returns A URL path string or null if no link is applicable
 */
function getEntityLink(entityType: string, entityId: string): string | null {
  const normalized = entityType.toLowerCase();
  switch (normalized) {
    case "issue":
      return `/issues/${entityId}`;
    case "project":
      return `/projects`;
    case "workflow":
      return `/workflows`;
    case "board":
      return `/boards`;
    default:
      return null;
  }
}

/**
 * ActivityItem renders a single activity feed entry.
 *
 * @description Shows the user avatar on the left, an action description
 * in the center ("{user} {action} {entityType} {entityId}"), and a relative
 * timestamp on the right. The entity name links to its detail page when
 * applicable. The row highlights on hover for discoverability.
 *
 * @param props - ActivityItemProps
 * @returns A single activity row element
 *
 * @example
 * <ActivityItem
 *   action="CREATED"
 *   entityType="Issue"
 *   entityId="ENG-5"
 *   userName="Frank Admin"
 *   timestamp={new Date()}
 * />
 */
export function ActivityItem({
  action,
  entityType,
  entityId,
  userName,
  userImage,
  timestamp,
  className,
}: ActivityItemProps) {
  const entityLink = getEntityLink(entityType, entityId);
  const displayName = userName ?? "Unknown";
  const actionVerb = formatAction(action);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50",
        className,
      )}
      role="listitem"
    >
      {/* User avatar */}
      <Avatar className="size-8 shrink-0">
        <AvatarImage
          src={userImage ?? undefined}
          alt={displayName}
        />
        <AvatarFallback className="text-[10px]">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      {/* Action description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">
          <span className="font-medium">{displayName}</span>
          {" "}
          {actionVerb}
          {" "}
          <span className="text-muted-foreground">{entityType}</span>
          {" "}
          {entityLink ? (
            <Link
              href={entityLink}
              className="font-medium text-primary hover:underline"
            >
              {entityId}
            </Link>
          ) : (
            <span className="font-medium">{entityId}</span>
          )}
        </p>
      </div>

      {/* Timestamp */}
      <time
        className="shrink-0 text-xs text-muted-foreground"
        dateTime={new Date(timestamp).toISOString()}
      >
        {formatTimestamp(timestamp)}
      </time>
    </div>
  );
}

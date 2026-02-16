/**
 * IssueActivityTab component.
 *
 * @description Renders a combined timeline of issue history changes and
 * comments for a specific issue. Fetches data from the issue.getHistory
 * and issue.listComments tRPC endpoints, merges them by timestamp, and
 * displays them in reverse chronological order.
 *
 * @module IssueActivityTab
 */
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { History, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

interface IssueActivityTabProps {
  /** The issue ID to display activity for */
  issueId: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Shape of a merged timeline entry.
 */
interface TimelineEntry {
  id: string;
  type: "history" | "comment";
  timestamp: Date;
  userName: string | null;
  userImage: string | null;
  /** For history entries */
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  /** For comment entries */
  body?: string | null;
}

/**
 * Extracts initials from a user display name.
 *
 * @param name - The user's full name
 * @returns Up to 2 uppercase initials
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
 * Formats a date as a relative timestamp.
 *
 * @param date - The date to format
 * @returns A human-readable relative timestamp
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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
  }).format(date);
}

/**
 * IssueActivityTab renders a combined timeline of history and comments.
 *
 * @description Fetches issue history and comments in parallel, merges them
 * into a single timeline sorted by timestamp (newest first), and renders
 * each entry with the appropriate format. History entries show field changes
 * ("changed {field} from {old} to {new}"), while comment entries show the
 * full comment body.
 *
 * @param props - IssueActivityTabProps
 * @returns A timeline view of issue activity
 *
 * @example
 * <IssueActivityTab issueId="issue-123" />
 */
export function IssueActivityTab({ issueId, className }: IssueActivityTabProps) {
  const t = useTranslations("activity");

  const { data: historyData, isLoading: historyLoading } =
    trpc.issue.getHistory.useQuery(
      { issueId, limit: 50 },
      { enabled: !!issueId },
    );

  const { data: commentsData, isLoading: commentsLoading } =
    trpc.issue.listComments.useQuery(
      { issueId, limit: 50 },
      { enabled: !!issueId },
    );

  const isLoading = historyLoading || commentsLoading;

  const timeline: TimelineEntry[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawHistory = (historyData as any)?.items ?? historyData ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawComments = (commentsData as any)?.items ?? commentsData ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const historyEntries: TimelineEntry[] = rawHistory.map((h: any) => ({
      id: `history-${h.id}`,
      type: "history" as const,
      timestamp: new Date(h.createdAt),
      userName: h.user?.name ?? null,
      userImage: h.user?.image ?? null,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentEntries: TimelineEntry[] = rawComments.map((c: any) => ({
      id: `comment-${c.id}`,
      type: "comment" as const,
      timestamp: new Date(c.createdAt),
      userName: c.author?.name ?? null,
      userImage: c.author?.image ?? null,
      body: c.body,
    }));

    return [...historyEntries, ...commentEntries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }, [historyData, commentsData]);

  if (isLoading) {
    return <ActivityTabSkeleton />;
  }

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-8" />}
        title={t("noActivity")}
        description={t("noActivityDescription")}
        className="py-8"
      />
    );
  }

  return (
    <div className={cn("space-y-1", className)} role="list" aria-label={t("title")}>
      {timeline.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
          role="listitem"
        >
          {/* User avatar */}
          <Avatar className="size-8 shrink-0">
            <AvatarImage
              src={entry.userImage ?? undefined}
              alt={entry.userName ?? ""}
            />
            <AvatarFallback className="text-[10px]">
              {getInitials(entry.userName)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {entry.type === "history" ? (
              <HistoryEntryContent entry={entry} />
            ) : (
              <CommentEntryContent entry={entry} />
            )}
          </div>

          {/* Timestamp */}
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={entry.timestamp.toISOString()}
          >
            {formatTimestamp(entry.timestamp)}
          </time>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the content of a history change entry.
 */
function HistoryEntryContent({ entry }: { entry: TimelineEntry }) {
  const t = useTranslations("activity");
  const displayName = entry.userName ?? "Unknown";

  return (
    <div className="space-y-0.5">
      <p className="text-sm text-foreground">
        <span className="font-medium">{displayName}</span>
        {" "}
        {t("changedField", { user: "", field: entry.field ?? "field" }).trim()}
      </p>
      {(entry.oldValue || entry.newValue) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {entry.oldValue && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive line-through">
              {entry.oldValue}
            </span>
          )}
          {entry.oldValue && entry.newValue && (
            <span aria-hidden="true">&rarr;</span>
          )}
          {entry.newValue && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
              {entry.newValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the content of a comment entry.
 */
function CommentEntryContent({ entry }: { entry: TimelineEntry }) {
  const displayName = entry.userName ?? "Unknown";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{displayName}</span>
        <MessageSquare className="size-3 text-muted-foreground" aria-hidden="true" />
      </div>
      {entry.body && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground">
          <p>{entry.body}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the activity tab.
 */
function ActivityTabSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-3 py-2">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

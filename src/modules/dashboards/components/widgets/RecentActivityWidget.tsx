"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Shape of a single activity entry.
 */
interface ActivityEntry {
  id: string;
  text: string;
  userName: string;
  userImage?: string | null;
  timestamp: string;
  formattedTime: string;
}

/**
 * Date formatter for activity timestamps.
 * Uses Intl.DateTimeFormat for pure, locale-aware formatting.
 */
const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface RecentActivityWidgetProps {
  /** Maximum number of activity entries to display */
  limit?: number;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Extracts initials from a display name.
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * RecentActivityWidget displays a chronological list of recent project
 * activities (issue updates, comments, transitions).
 *
 * @description Each entry shows an avatar, activity description, and relative
 * timestamp. Uses the issue.list tRPC query to derive recent activity from
 * latest issue updates. Shows a skeleton while loading and an empty state
 * when there is no activity.
 *
 * @param props - RecentActivityWidgetProps
 * @returns A card widget with a recent activity feed
 *
 * @example
 * <RecentActivityWidget limit={5} />
 */
export function RecentActivityWidget({
  limit = 5,
  className,
}: RecentActivityWidgetProps) {
  const t = useTranslations("dashboards");

  // Fetch recently updated issues as a proxy for activity
  const { data: issueData, isLoading } = trpc.issue.list.useQuery(
    { projectId: "default", limit, sortBy: "updatedAt", sortOrder: "desc" },
    { enabled: true },
  );

  // Transform issue list into activity entries with formatted timestamps
  const activities: ActivityEntry[] = useMemo(() => {
    if (!issueData) return [];
    const items = (issueData as unknown as { items?: Array<{
      id: string;
      key: string;
      summary: string;
      assignee?: { name: string | null; image?: string | null } | null;
      updatedAt?: string;
    }> })?.items ?? [];

    return items.slice(0, limit).map((issue) => {
      const timestamp = issue.updatedAt ?? "";
      const formattedTime = timestamp
        ? dateFormatter.format(new Date(timestamp))
        : "";

      return {
        id: issue.id,
        text: `${issue.key}: ${issue.summary}`,
        userName: issue.assignee?.name ?? "System",
        userImage: issue.assignee?.image ?? null,
        timestamp,
        formattedTime,
      };
    });
  }, [issueData, limit]);

  return (
    <Card className={cn("flex flex-col", className)} role="article" aria-label={t("recentActivityWidget")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("recentActivityWidget")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <RecentActivitySkeleton />
        ) : activities.length === 0 ? (
          <EmptyState
            title={t("noRecentActivity")}
            description={t("noRecentActivityDescription")}
            className="py-8"
          />
        ) : (
          <div className="space-y-3" role="list">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3"
                role="listitem"
              >
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarImage
                    src={activity.userImage ?? undefined}
                    alt={activity.userName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(activity.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs leading-snug text-foreground">
                    <span className="font-medium">{activity.userName}</span>
                    {" "}
                    {t("updatedIssue")}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {activity.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {activity.formattedTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for RecentActivityWidget.
 */
function RecentActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

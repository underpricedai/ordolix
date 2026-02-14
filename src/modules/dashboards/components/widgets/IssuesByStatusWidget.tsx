"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Status item for the chart display.
 */
interface StatusItem {
  name: string;
  category: string;
  count: number;
}

/**
 * Color mapping for status categories.
 */
const categoryColors: Record<string, string> = {
  TO_DO: "bg-muted-foreground/60",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
};

interface IssuesByStatusWidgetProps {
  /** Project ID to scope the query (optional, all projects if omitted) */
  projectId?: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * IssuesByStatusWidget displays a horizontal bar chart of issue counts
 * grouped by workflow status.
 *
 * @description Renders colored bar segments proportional to each status count.
 * Uses the dashboard.getById tRPC query for data (cast through unknown for
 * Prisma JSON compatibility). Shows a skeleton while loading and an empty state
 * when no data is available.
 *
 * @param props - IssuesByStatusWidgetProps
 * @returns A card widget with a status bar chart
 *
 * @example
 * <IssuesByStatusWidget projectId="proj-123" />
 */
export function IssuesByStatusWidget({
  projectId,
  className,
}: IssuesByStatusWidgetProps) {
  const t = useTranslations("dashboards");

  // Query issues grouped by status via issue.list
  // In production this would be a dedicated aggregation endpoint
  const { data: issueData, isLoading } = trpc.issue.list.useQuery(
    { projectId: projectId ?? "default", limit: 100 },
    { enabled: true },
  );

  // Aggregate issues by status
  const statusItems: StatusItem[] = useMemo(() => {
    if (!issueData) return [];
    const items = (issueData as unknown as { items?: Array<{
      status?: { name: string; category: string };
    }> })?.items ?? [];

    const countMap = new Map<string, StatusItem>();
    for (const issue of items) {
      const status = issue.status;
      if (!status) continue;
      const existing = countMap.get(status.name);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(status.name, {
          name: status.name,
          category: status.category,
          count: 1,
        });
      }
    }
    return Array.from(countMap.values()).sort((a, b) => b.count - a.count);
  }, [issueData]);

  const totalCount = statusItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={cn("flex flex-col", className)} role="article" aria-label={t("issuesByStatus")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("issuesByStatus")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <IssuesByStatusSkeleton />
        ) : statusItems.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={t("issuesByStatusDescription")}
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {/* Stacked horizontal bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={t("issuesByStatus")}>
              {statusItems.map((item) => {
                const widthPercent = totalCount > 0
                  ? (item.count / totalCount) * 100
                  : 0;
                return (
                  <div
                    key={item.name}
                    className={cn(
                      "h-full transition-all",
                      categoryColors[item.category] ?? "bg-primary",
                    )}
                    style={{ width: `${widthPercent}%` }}
                    title={`${item.name}: ${item.count}`}
                  />
                );
              })}
            </div>

            {/* Legend / breakdown list */}
            <div className="space-y-2">
              {statusItems.map((item) => {
                const maxVal = Math.max(...statusItems.map((s) => s.count), 1);
                const widthPercent = (item.count / maxVal) * 100;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            categoryColors[item.category] ?? "bg-primary",
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          categoryColors[item.category] ?? "bg-primary",
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for IssuesByStatusWidget.
 */
function IssuesByStatusSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-6" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

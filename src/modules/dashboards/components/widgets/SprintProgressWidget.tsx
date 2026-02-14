"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

interface SprintProgressWidgetProps {
  /** Project ID for scoping sprint data */
  projectId?: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * SprintProgressWidget displays the completion percentage of the active sprint.
 *
 * @description Shows a progress bar with the percentage of completed vs total
 * issues in the current sprint. Includes the sprint name, days remaining, and
 * a breakdown of done vs total issues. Uses issue.list tRPC query to derive
 * sprint completion data. Shows a skeleton while loading and an empty state
 * when no sprint is active.
 *
 * @param props - SprintProgressWidgetProps
 * @returns A card widget with sprint progress
 *
 * @example
 * <SprintProgressWidget projectId="proj-123" />
 */
export function SprintProgressWidget({
  projectId,
  className,
}: SprintProgressWidgetProps) {
  const t = useTranslations("dashboards");

  // Fetch issues for the current sprint
  const { data: issueData, isLoading } = trpc.issue.list.useQuery(
    { projectId: projectId ?? "default", limit: 100 },
    { enabled: true },
  );

  // Calculate sprint progress from issue statuses
  const sprintStats = useMemo(() => {
    if (!issueData) return null;

    const items = (issueData as unknown as { items?: Array<{
      status?: { category: string };
      sprint?: { name: string; endDate?: string } | null;
    }> })?.items ?? [];

    if (items.length === 0) return null;

    const totalIssues = items.length;
    const doneIssues = items.filter(
      (issue) => issue.status?.category === "DONE",
    ).length;
    const inProgressIssues = items.filter(
      (issue) => issue.status?.category === "IN_PROGRESS",
    ).length;
    const todoIssues = totalIssues - doneIssues - inProgressIssues;

    const percentage = totalIssues > 0
      ? Math.round((doneIssues / totalIssues) * 100)
      : 0;

    // Derive sprint name from first issue with a sprint
    const sprintIssue = items.find((i) => i.sprint);
    const sprintName = sprintIssue?.sprint?.name ?? null;

    // Calculate days remaining
    const endDateStr = sprintIssue?.sprint?.endDate;
    let daysRemaining: number | null = null;
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      const now = new Date();
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    return {
      sprintName,
      totalIssues,
      doneIssues,
      inProgressIssues,
      todoIssues,
      percentage,
      daysRemaining,
    };
  }, [issueData]);

  return (
    <Card className={cn("flex flex-col", className)} role="article" aria-label={t("sprintProgress")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Zap className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("sprintProgress")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <SprintProgressSkeleton />
        ) : !sprintStats ? (
          <EmptyState
            title={t("noSprintActive")}
            description={t("noSprintActiveDescription")}
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {/* Sprint name and days remaining */}
            <div className="flex items-center justify-between">
              {sprintStats.sprintName && (
                <span className="text-sm font-medium text-foreground">
                  {sprintStats.sprintName}
                </span>
              )}
              {sprintStats.daysRemaining !== null && (
                <Badge variant="outline" className="text-xs">
                  {t("sprintDaysRemaining", {
                    count: sprintStats.daysRemaining,
                  })}
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("sprintComplete", {
                    percentage: sprintStats.percentage,
                  })}
                </span>
                <span className="font-medium tabular-nums">
                  {sprintStats.doneIssues}/{sprintStats.totalIssues}
                </span>
              </div>
              <Progress
                value={sprintStats.percentage}
                className="h-2.5"
                aria-label={t("sprintComplete", {
                  percentage: sprintStats.percentage,
                })}
              />
            </div>

            {/* Status breakdown */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-green-500" aria-hidden="true" />
                <span>
                  {sprintStats.doneIssues} done
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-blue-500" aria-hidden="true" />
                <span>
                  {sprintStats.inProgressIssues} in progress
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                <span>
                  {sprintStats.todoIssues} to do
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for SprintProgressWidget.
 */
function SprintProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

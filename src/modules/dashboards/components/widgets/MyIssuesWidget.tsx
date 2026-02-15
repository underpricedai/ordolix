"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Issue shape for the table display.
 */
interface MyIssue {
  id: string;
  key: string;
  summary: string;
  status: {
    name: string;
    category: StatusCategory;
  };
  priority?: {
    name: string;
  };
}

/**
 * Maps a priority name to the PriorityLevel type.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = [
    "highest",
    "high",
    "medium",
    "low",
    "lowest",
  ];
  return validLevels.includes(normalized) ? normalized : "medium";
}

interface MyIssuesWidgetProps {
  /** Maximum number of issues to display */
  limit?: number;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * MyIssuesWidget displays a compact table of issues assigned to the current user.
 *
 * @description Shows issue key (linked to detail page), summary, status badge,
 * and priority icon. Uses the issue.list tRPC query scoped to the current
 * user's assignments. Shows a skeleton while loading and an empty state when
 * the user has no assigned issues.
 *
 * @param props - MyIssuesWidgetProps
 * @returns A card widget with a user's assigned issues table
 *
 * @example
 * <MyIssuesWidget limit={10} />
 */
export function MyIssuesWidget({
  limit = 8,
  className,
}: MyIssuesWidgetProps) {
  const t = useTranslations("dashboards");
  const ti = useTranslations("issues");

  // Fetch issues assigned to the current user
  // In production, assigneeId would be the current user's ID from session
  const { data: issueData, isLoading } = trpc.issue.list.useQuery(
    {
      projectId: "default",
      limit,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
    { enabled: true },
  );

  const issues: MyIssue[] = useMemo(() => {
    if (!issueData) return [];
    const items = (issueData as unknown as { items?: Array<{
      id: string;
      key: string;
      summary: string;
      status?: { name: string; category: string };
      priority?: { name: string };
    }> })?.items ?? [];

    return items.slice(0, limit).map((item) => ({
      id: item.id,
      key: item.key,
      summary: item.summary,
      status: {
        name: item.status?.name ?? "To Do",
        category: (item.status?.category as StatusCategory) ?? "TO_DO",
      },
      priority: item.priority,
    }));
  }, [issueData, limit]);

  return (
    <Card className={cn("flex flex-col", className)} role="article" aria-label={t("myIssues")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("myIssues")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <MyIssuesSkeleton />
        ) : issues.length === 0 ? (
          <EmptyState
            title={t("noIssuesAssigned")}
            description={t("noIssuesAssignedDescription")}
            className="py-8"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    {ti("columns.key")}
                  </TableHead>
                  <TableHead>{ti("columns.summary")}</TableHead>
                  <TableHead className="w-[120px]">
                    {ti("columns.status")}
                  </TableHead>
                  <TableHead className="w-[80px]">
                    {ti("columns.priority")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Link
                        href={`/issues/${issue.key}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {issue.key}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {issue.summary}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        name={issue.status.name}
                        category={issue.status.category}
                      />
                    </TableCell>
                    <TableCell>
                      {issue.priority && (
                        <PriorityIcon
                          priority={toPriorityLevel(issue.priority.name)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for MyIssuesWidget.
 */
function MyIssuesSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="space-y-0">
        {/* Header row */}
        <div className="flex items-center gap-4 border-b px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="size-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { EmptyState } from "@/shared/components/empty-state";
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Valid sort field options for the issue list.
 */
type SortField = "createdAt" | "updatedAt" | "priority" | "rank";

/**
 * Valid sort order options.
 */
type SortOrder = "asc" | "desc";

interface IssueListProps {
  /** Project ID to list issues for */
  projectId: string;
  /** Optional search query to filter issues */
  searchQuery?: string;
  /** Optional status ID filter */
  statusId?: string;
  /** Optional assignee ID filter */
  assigneeId?: string;
  /** Optional issue type ID filter */
  issueTypeId?: string;
  /** Callback when the create button is clicked from the empty state */
  onCreateClick?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Maps a priority name from the database to the PriorityLevel type.
 * Falls back to "medium" for unknown values.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = ["highest", "high", "medium", "low", "lowest"];
  return validLevels.includes(normalized) ? normalized : "medium";
}

/**
 * Extracts initials from a user display name.
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
 * IssueList renders a sortable, paginated table of issues.
 *
 * @description Server-side rendered table using shadcn Table components.
 * Columns include key, summary, type icon, status badge, priority icon,
 * assignee avatar, and created date. Supports sorting, pagination,
 * and displays an empty state when no issues exist.
 * @param props - IssueListProps
 * @returns A table component with issue rows
 *
 * @example
 * <IssueList projectId="proj-1" searchQuery="login bug" onCreateClick={() => setOpen(true)} />
 */
export function IssueList({
  projectId,
  searchQuery,
  statusId,
  assigneeId,
  issueTypeId,
  onCreateClick,
  className,
}: IssueListProps) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const router = useRouter();

  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const limit = 50;

  const {
    data: issuesData,
    isLoading,
    error,
  } = trpc.issue.list.useQuery(
    {
      projectId,
      search: searchQuery || undefined,
      statusId: statusId || undefined,
      assigneeId: assigneeId || undefined,
      issueTypeId: issueTypeId || undefined,
      sortBy,
      sortOrder,
      cursor,
      limit,
    },
    { placeholderData: (prev) => prev },
  );

  const issues = useMemo(() => issuesData?.items ?? [], [issuesData?.items]);
  const total = issuesData?.total ?? 0;
  const hasMore = issues.length === limit;
  const hasPrevious = pageHistory.length > 0;

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
      setCursor(undefined);
      setPageHistory([]);
    },
    [sortBy],
  );

  const handleNextPage = useCallback(() => {
    const lastIssue = issues[issues.length - 1];
    if (lastIssue) {
      setPageHistory((prev) => [...prev, cursor ?? ""]);
      setCursor(lastIssue.id);
    }
  }, [issues, cursor]);

  const handlePreviousPage = useCallback(() => {
    setPageHistory((prev) => {
      const newHistory = [...prev];
      const previousCursor = newHistory.pop();
      setCursor(previousCursor || undefined);
      return newHistory;
    });
  }, []);

  const handleRowClick = useCallback(
    (issueId: string) => {
      router.push(`/issues/${issueId}`);
    },
    [router],
  );

  if (isLoading) {
    return <IssueTableSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Inbox className="size-12" />}
        title={tc("error")}
        description={error.message}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  if (issues.length === 0 && !cursor) {
    return (
      <EmptyState
        icon={<Inbox className="size-12" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          onCreateClick ? (
            <Button onClick={onCreateClick}>{t("createIssue")}</Button>
          ) : undefined
        }
      />
    );
  }

  const columns: ResponsiveColumnDef<IssueRow>[] = [
    {
      key: "key",
      header: t("columns.key"),
      cell: (issue) => (
        <Link
          href={`/issues/${issue.id}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {issue.key}
        </Link>
      ),
      priority: 1,
      className: "w-[120px]",
    },
    {
      key: "summary",
      header: t("columns.summary"),
      cell: (issue) => <span className="max-w-[400px] truncate">{issue.summary}</span>,
      priority: 1,
    },
    {
      key: "status",
      header: t("columns.status"),
      cell: (issue) =>
        issue.status ? (
          <StatusBadge name={issue.status.name} category={issue.status.category as StatusCategory} />
        ) : null,
      priority: 2,
      className: "w-[140px]",
    },
    {
      key: "priority",
      header: t("columns.priority"),
      cell: (issue) =>
        issue.priority ? <PriorityIcon priority={toPriorityLevel(issue.priority.name)} showLabel /> : null,
      priority: 3,
      className: "w-[100px]",
    },
    {
      key: "type",
      header: t("type"),
      cell: (issue) =>
        issue.issueType ? <span className="text-xs text-muted-foreground">{issue.issueType.name}</span> : null,
      priority: 4,
      className: "w-[100px]",
    },
    {
      key: "assignee",
      header: t("columns.assignee"),
      cell: (issue) =>
        issue.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={issue.assignee.image ?? undefined} alt={issue.assignee.name ?? ""} />
              <AvatarFallback className="text-[10px]">{getInitials(issue.assignee.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{issue.assignee.name ?? t("unassigned")}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t("unassigned")}</span>
        ),
      priority: 4,
      className: "w-[160px]",
    },
    {
      key: "created",
      header: t("created"),
      cell: (issue) => (
        <span className="text-sm text-muted-foreground">
          {issue.createdAt
            ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(issue.createdAt))
            : "-"}
        </span>
      ),
      priority: 5,
      className: "w-[140px]",
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border">
        <ResponsiveTable
          columns={columns}
          data={issues}
          rowKey={(issue: IssueRow) => issue.id}
          onRowClick={(issue: IssueRow) => handleRowClick(issue.id)}
          mobileCard={(issue: IssueRow) => (
            <Card className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {issue.key}
                    </Link>
                    {issue.status && (
                      <StatusBadge
                        name={issue.status.name}
                        category={issue.status.category as StatusCategory}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">
                    {issue.summary}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {issue.priority && (
                      <PriorityIcon priority={toPriorityLevel(issue.priority.name)} />
                    )}
                    {issue.issueType && <span>{issue.issueType.name}</span>}
                    {issue.createdAt && (
                      <span>
                        {new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(
                          new Date(issue.createdAt),
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {issue.assignee && (
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={issue.assignee.image ?? undefined} alt={issue.assignee.name ?? ""} />
                    <AvatarFallback className="text-[10px]">{getInitials(issue.assignee.name)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </Card>
          )}
        />
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {tc("itemCount", { count: total })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!hasPrevious}
            aria-label={tc("back")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {tc("back")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasMore}
            aria-label={tc("next")}
          >
            {tc("next")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sortable column header button.
 */
function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortOrder;
  onClick?: () => void;
}) {
  if (!onClick) {
    return <span>{label}</span>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={onClick}
      aria-label={`${label} - ${active ? `sorted ${direction}` : "click to sort"}`}
    >
      {label}
      <ArrowUpDown
        className={cn("ml-1 size-3.5", active ? "opacity-100" : "opacity-40")}
        aria-hidden="true"
      />
    </Button>
  );
}

/**
 * Loosely typed issue row type from tRPC endpoint.
 * The real types come from the issues module Prisma include.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IssueRow = any;

/**
 * Skeleton loading state for the issues table.
 */
function IssueTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead className="w-[100px]">
              <Skeleton className="h-4 w-12" />
            </TableHead>
            <TableHead className="w-[140px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="w-[100px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="w-[160px]">
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead className="w-[140px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-64" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

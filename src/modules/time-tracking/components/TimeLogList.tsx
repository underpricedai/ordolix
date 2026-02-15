"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import {
  ResponsiveTable,
  type ResponsiveColumnDef,
} from "@/shared/components/responsive-table";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

/**
 * Formats a duration in minutes to a human-readable string.
 *
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2h 30m"
 */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Groups time log entries by date string for display.
 */
function groupByDate(
  items: TimeLogEntry[],
): Map<string, TimeLogEntry[]> {
  const groups = new Map<string, TimeLogEntry[]>();
  for (const item of items) {
    const dateKey = new Intl.DateTimeFormat("en", {
      dateStyle: "full",
    }).format(new Date(item.date));
    const existing = groups.get(dateKey) ?? [];
    existing.push(item);
    groups.set(dateKey, existing);
  }
  return groups;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimeLogEntry = any;

interface TimeLogListProps {
  /** Optional issue ID to filter time logs */
  issueId?: string;
  /** Optional user ID to filter time logs */
  userId?: string;
}

/**
 * TimeLogList renders a table of time log entries grouped by date.
 *
 * @description Displays time entries with columns for date, issue, duration,
 * description, category, and user. Groups entries by date with daily totals.
 * Supports edit and delete actions.
 *
 * @param props - TimeLogListProps
 * @returns Time log list component
 */
export function TimeLogList({ issueId, userId }: TimeLogListProps) {
  const t = useTranslations("timeTracking");
  const tc = useTranslations("common");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: timeLogsData,
    isLoading,
    error,
  } = trpc.timeTracking.list.useQuery(
    { issueId, userId, limit: 50 },
    { enabled: true },
  );

  const deleteMutation = trpc.timeTracking.delete.useMutation({
    onSuccess: () => setDeleteTarget(null),
  });

  const utils = trpc.useUtils();

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            void utils.timeTracking.list.invalidate();
          },
        },
      );
    },
    [deleteMutation, utils],
  );

  const items: TimeLogEntry[] = useMemo(
    () => (timeLogsData?.items ?? []) as TimeLogEntry[],
    [timeLogsData],
  );
  const grouped = useMemo(() => groupByDate(items), [items]);

  if (isLoading) return <TimeLogListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<Clock className="size-12" />}
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

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-12" />}
        title={t("noTimeLogs")}
        description={t("noTimeLogs")}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([dateLabel, entries]) => {
          const dailyTotal = entries.reduce(
            (sum: number, e: TimeLogEntry) => sum + (e.duration ?? 0),
            0,
          );

          const timeLogColumns: ResponsiveColumnDef<TimeLogEntry>[] = [
            {
              key: "description",
              header: t("description"),
              cell: (entry) => (
                <span className="max-w-[300px] truncate text-muted-foreground">
                  {entry.description || "-"}
                </span>
              ),
              priority: 1,
            },
            {
              key: "duration",
              header: t("timeSpent"),
              cell: (entry) => (
                <Badge variant="outline">
                  {formatDuration(entry.duration ?? 0)}
                </Badge>
              ),
              priority: 1,
              className: "w-[100px]",
            },
            {
              key: "date",
              header: "Date",
              cell: (entry) =>
                new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(entry.date),
                ),
              priority: 2,
            },
            {
              key: "issue",
              header: "Issue",
              cell: (entry) => (
                <span className="font-medium text-primary">
                  {entry.issue?.key ?? entry.issueId}
                </span>
              ),
              priority: 3,
            },
            {
              key: "user",
              header: "User",
              cell: (entry) => (
                <span className="text-sm text-muted-foreground">
                  {entry.user?.name ?? "-"}
                </span>
              ),
              priority: 4,
              className: "w-[140px]",
            },
            {
              key: "actions",
              header: tc("actions"),
              cell: (entry) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tc("edit")}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tc("delete")}
                    onClick={() => setDeleteTarget(entry.id)}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              ),
              priority: 1,
              className: "w-[80px]",
            },
          ];

          return (
            <div key={dateLabel} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {dateLabel}
                </h3>
                <Badge variant="secondary">{formatDuration(dailyTotal)}</Badge>
              </div>
              <div className="rounded-md border">
                <ResponsiveTable
                  columns={timeLogColumns}
                  data={entries}
                  rowKey={(entry) => entry.id}
                  mobileCard={(entry) => (
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {entry.description || "-"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-xs" aria-label={tc("edit")}>
                            <Pencil className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={tc("delete")}
                            onClick={() => setDeleteTarget(entry.id)}
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(entry.duration ?? 0)}
                        </Badge>
                        <span>
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                            new Date(entry.date),
                          )}
                        </span>
                      </div>
                    </Card>
                  )}
                />
                {/* Daily total footer — shown below the responsive table */}
                <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
                  <span>{t("totalLogged")}</span>
                  <span className="font-semibold">{formatDuration(dailyTotal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("deleteTimeLog")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {tc("confirm")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleteMutation.isPending ? tc("loading") : tc("delete")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

/**
 * Skeleton loading state for the time log list.
 */
function TimeLogListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, j) => (
                  <TableRow key={j}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

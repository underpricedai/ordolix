"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  ResponsiveTable,
  type ResponsiveColumnDef,
} from "@/shared/components/responsive-table";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { trpc } from "@/shared/lib/trpc";

/**
 * Returns the start of the week (Monday) for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an array of 7 dates starting from the given Monday.
 */
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Formats minutes to a short hours string.
 */
function formatHours(minutes: number): string {
  if (minutes === 0) return "";
  const h = (minutes / 60).toFixed(1);
  return `${h}h`;
}

/**
 * Short day labels for table headers.
 */
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface TimesheetRow {
  issueId: string;
  issueKey: string;
  issueSummary: string;
  /** Minutes per day index (0=Mon, 6=Sun) */
  daily: number[];
}

/**
 * TimesheetView renders a weekly timesheet grid.
 *
 * @description Displays a grid where rows are issues and columns are days of the week.
 * Each cell is an editable hours input. Shows row and column totals.
 * Includes navigation to previous/next weeks and a submit button.
 *
 * @returns Weekly timesheet component
 */
export function TimesheetView() {
  const t = useTranslations("timeTracking");
  const tc = useTranslations("common");

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Fetch time logs for the current week
  const { data: timeLogsData, isLoading } = trpc.timeTracking.list.useQuery(
    {
      startDate: weekStart,
      endDate: weekEnd,
      limit: 100,
    },
    { enabled: true },
  );

  // Build timesheet rows from fetched data
  const rows: TimesheetRow[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = timeLogsData?.items ?? [];
    const issueMap = new Map<string, TimesheetRow>();

    for (const log of items) {
      const logDate = new Date(log.date);
      const dayIndex = (logDate.getDay() + 6) % 7; // Convert to Mon=0

      if (!issueMap.has(log.issueId)) {
        issueMap.set(log.issueId, {
          issueId: log.issueId,
          issueKey: log.issue?.key ?? log.issueId,
          issueSummary: log.issue?.summary ?? "",
          daily: [0, 0, 0, 0, 0, 0, 0],
        });
      }

      const row = issueMap.get(log.issueId)!;
      row.daily[dayIndex] += log.duration ?? 0;
    }

    return Array.from(issueMap.values());
  }, [timeLogsData]);

  // Column totals
  const columnTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const row of rows) {
      for (let i = 0; i < 7; i++) {
        totals[i] = (totals[i] ?? 0) + (row.daily[i] ?? 0);
      }
    }
    return totals;
  }, [rows]);

  const grandTotal = columnTotals.reduce((a, b) => a + b, 0);

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      setWeekStart((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction * 7);
        return next;
      });
    },
    [],
  );

  const weekLabel = `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekStart)} - ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(weekEnd)}`;

  const isMobile = useIsMobile();

  // Day-summary data for ResponsiveTable (mobile view)
  interface DaySummary {
    dayLabel: string;
    date: Date;
    totalMinutes: number;
    logCount: number;
    status: "logged" | "empty";
  }

  const daySummaries: DaySummary[] = useMemo(() => {
    return weekDays.map((date, i) => {
      const totalMinutes = columnTotals[i] ?? 0;
      const logCount = rows.reduce(
        (count, row) => count + ((row.daily[i] ?? 0) > 0 ? 1 : 0),
        0,
      );
      return {
        dayLabel: `${DAY_LABELS[i]} ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)}`,
        date,
        totalMinutes,
        logCount,
        status: totalMinutes > 0 ? ("logged" as const) : ("empty" as const),
      };
    });
  }, [weekDays, columnTotals, rows]);

  const daySummaryColumns: ResponsiveColumnDef<DaySummary>[] = useMemo(
    () => [
      {
        key: "day",
        header: "Day",
        cell: (row) => <span className="font-medium">{row.dayLabel}</span>,
        priority: 1,
      },
      {
        key: "hours",
        header: "Hours",
        cell: (row) => (
          <span className="font-semibold">
            {formatHours(row.totalMinutes) || "-"}
          </span>
        ),
        priority: 1,
      },
      {
        key: "logCount",
        header: "Entries",
        cell: (row) => <span>{row.logCount}</span>,
        priority: 2,
      },
      {
        key: "status",
        header: tc("status"),
        cell: (row) => (
          <Badge variant={row.status === "logged" ? "secondary" : "outline"}>
            {row.status === "logged" ? "Logged" : "Empty"}
          </Badge>
        ),
        priority: 3,
      },
    ],
    [tc],
  );

  if (isLoading) return <TimesheetSkeleton />;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-[200px] text-center text-sm font-medium">
            {weekLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(1)}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {t("totalLogged")}: {formatHours(grandTotal) || "0h"}
          </Badge>
          <Button>
            <Send className="mr-2 size-4" aria-hidden="true" />
            {tc("submit")}
          </Button>
        </div>
      </div>

      {/* Timesheet grid — full grid on desktop, day-summary on mobile */}
      {isMobile ? (
        <div className="rounded-md border">
          <ResponsiveTable
            columns={daySummaryColumns}
            data={daySummaries}
            rowKey={(row) => row.dayLabel}
            mobileCard={(row) => (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{row.dayLabel}</span>
                  <Badge variant={row.status === "logged" ? "secondary" : "outline"}>
                    {row.status === "logged" ? "Logged" : "Empty"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatHours(row.totalMinutes) || "0h"} logged
                  {row.logCount > 0 && ` across ${row.logCount} entries`}
                </div>
              </Card>
            )}
            emptyMessage={t("noTimeLogs")}
          />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Issue</TableHead>
                <TableHead className="max-w-[200px]">Summary</TableHead>
                {DAY_LABELS.map((day, i) => (
                  <TableHead key={day} className="w-[90px] text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">{day}</span>
                      <span className="text-xs">
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(weekDays[i])}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[80px] text-center">{t("totalLogged")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("noTimeLogs")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowTotal = row.daily.reduce((a, b) => a + b, 0);
                  return (
                    <TableRow key={row.issueId}>
                      <TableCell className="font-medium text-primary">
                        {row.issueKey}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {row.issueSummary}
                      </TableCell>
                      {row.daily.map((mins, dayIdx) => (
                        <TableCell key={dayIdx} className="p-1 text-center">
                          <Input
                            type="number"
                            min={0}
                            step={0.25}
                            defaultValue={mins > 0 ? (mins / 60).toFixed(1) : ""}
                            placeholder="-"
                            className="h-8 w-full text-center text-sm"
                            aria-label={`${row.issueKey} ${DAY_LABELS[dayIdx]}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold">
                        {formatHours(rowTotal) || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    {t("totalLogged")}
                  </TableCell>
                  {columnTotals.map((total, i) => (
                    <TableCell key={i} className="text-center font-semibold">
                      {formatHours(total) || "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">
                    {formatHours(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the timesheet view.
 */
function TimesheetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              {Array.from({ length: 7 }).map((_, i) => (
                <TableHead key={i}><Skeleton className="mx-auto h-8 w-12" /></TableHead>
              ))}
              <TableHead><Skeleton className="mx-auto h-4 w-12" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="mx-auto h-8 w-16" /></TableCell>
                ))}
                <TableCell><Skeleton className="mx-auto h-4 w-12" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

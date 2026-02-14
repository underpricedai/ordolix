"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  GanttChart as GanttIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { GanttBar, type GanttBarData } from "./GanttBar";
import { GanttControls, type ZoomLevel } from "./GanttControls";

/**
 * Represents a hierarchical issue row in the Gantt left panel.
 */
interface GanttIssueRow {
  id: string;
  issueKey: string;
  summary: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  statusName: string;
  statusCategory: StatusCategory;
  depth: number;
  children: GanttIssueRow[];
}

/**
 * Dependency arrow data for drawing SVG connections.
 */
interface DependencyArrow {
  id: string;
  sourceId: string;
  targetId: string;
  type: "FS" | "FF" | "SS" | "SF";
}

/** Pixels per unit for each zoom level */
const ZOOM_UNIT_PX: Record<ZoomLevel, number> = {
  day: 40,
  week: 120,
  month: 200,
  quarter: 300,
};

/** Row height in the Gantt chart */
const ROW_HEIGHT = 36;

/** Left panel width */
const LEFT_PANEL_WIDTH = 360;

/**
 * Computes the pixel offset and width of a bar given a date range and zoom level.
 */
function computeBarMetrics(
  startDate: string,
  endDate: string,
  timelineStart: Date,
  zoomLevel: ZoomLevel,
): { offsetPx: number; widthPx: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 86_400_000;
  const dayOffset = Math.floor(
    (start.getTime() - timelineStart.getTime()) / msPerDay,
  );
  const daySpan = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / msPerDay),
  );

  const pxPerDay = ZOOM_UNIT_PX[zoomLevel] / (zoomLevel === "day" ? 1 : zoomLevel === "week" ? 7 : zoomLevel === "month" ? 30 : 90);

  return {
    offsetPx: dayOffset * pxPerDay,
    widthPx: daySpan * pxPerDay,
  };
}

/**
 * Generates timeline header labels based on zoom level.
 */
function generateTimelineHeaders(
  timelineStart: Date,
  timelineEnd: Date,
  zoomLevel: ZoomLevel,
): { label: string; widthPx: number }[] {
  const headers: { label: string; widthPx: number }[] = [];
  const current = new Date(timelineStart);

  while (current <= timelineEnd) {
    let label: string;
    let widthPx: number;

    switch (zoomLevel) {
      case "day": {
        label = new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
        }).format(current);
        widthPx = ZOOM_UNIT_PX.day;
        current.setDate(current.getDate() + 1);
        break;
      }
      case "week": {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        label = `${new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(current)}`;
        widthPx = ZOOM_UNIT_PX.week;
        current.setDate(current.getDate() + 7);
        break;
      }
      case "month": {
        label = new Intl.DateTimeFormat("en", {
          month: "short",
          year: "2-digit",
        }).format(current);
        widthPx = ZOOM_UNIT_PX.month;
        current.setMonth(current.getMonth() + 1);
        break;
      }
      case "quarter": {
        const q = Math.floor(current.getMonth() / 3) + 1;
        label = `Q${q} ${current.getFullYear()}`;
        widthPx = ZOOM_UNIT_PX.quarter;
        current.setMonth(current.getMonth() + 3);
        break;
      }
    }

    headers.push({ label, widthPx });
  }

  return headers;
}

/**
 * Flattens a tree of GanttIssueRows into a list, respecting collapsed state.
 */
function flattenRows(
  rows: GanttIssueRow[],
  collapsedIds: Set<string>,
): GanttIssueRow[] {
  const result: GanttIssueRow[] = [];
  for (const row of rows) {
    result.push(row);
    if (row.children.length > 0 && !collapsedIds.has(row.id)) {
      result.push(...flattenRows(row.children, collapsedIds));
    }
  }
  return result;
}

interface GanttChartProps {
  /** Project ID to load Gantt data for */
  projectId: string;
}

/**
 * GanttChart renders the main Gantt timeline view with a left panel showing
 * the issue hierarchy (epics > stories > tasks) and a right panel with
 * horizontal timeline bars.
 *
 * @description Uses tRPC `gantt.getTimeline` to fetch data. Features include:
 * - Expandable/collapsible hierarchy in the left panel
 * - Color-coded bars by status category
 * - Dependency arrows between linked issues
 * - Zoom controls (day/week/month/quarter)
 * - Today line indicator
 * - Draggable bar ends for date adjustment
 *
 * @param props - GanttChartProps
 * @returns The complete Gantt chart view
 *
 * @example
 * <GanttChart projectId="proj-123" />
 */
export function GanttChart({ projectId }: GanttChartProps) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // tRPC query for Gantt timeline data
  const {
    data: ganttData,
    isLoading,
    error,
  } = trpc.gantt.getData.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  // Parse API data into row structure
  const gantt = ganttData as unknown as { items?: GanttIssueRow[]; issues?: GanttIssueRow[]; dependencies?: DependencyArrow[] } | undefined;
  const rows: GanttIssueRow[] = useMemo(() => {
    if (!gantt) return [];
    return (gantt.items ?? gantt.issues ?? []) as GanttIssueRow[];
  }, [gantt]);

  const dependencies: DependencyArrow[] = useMemo(() => {
    if (!gantt?.dependencies) return [];
    return gantt.dependencies as DependencyArrow[];
  }, [gantt]);

  const visibleRows = useMemo(
    () => flattenRows(rows, collapsedIds),
    [rows, collapsedIds],
  );

  // Compute timeline bounds
  const { timelineStart, timelineEnd } = useMemo(() => {
    const now = new Date();
    let earliest = new Date(now);
    let latest = new Date(now);
    earliest.setMonth(earliest.getMonth() - 1);
    latest.setMonth(latest.getMonth() + 3);

    for (const row of visibleRows) {
      if (row.startDate) {
        const s = new Date(row.startDate);
        if (s < earliest) earliest = s;
      }
      if (row.endDate) {
        const e = new Date(row.endDate);
        if (e > latest) latest = e;
      }
    }

    return { timelineStart: earliest, timelineEnd: latest };
  }, [visibleRows]);

  const timelineHeaders = useMemo(
    () => generateTimelineHeaders(timelineStart, timelineEnd, zoomLevel),
    [timelineStart, timelineEnd, zoomLevel],
  );

  const totalTimelineWidth = timelineHeaders.reduce(
    (sum, h) => sum + h.widthPx,
    0,
  );

  // Today line offset
  const todayOffset = useMemo(() => {
    const now = new Date();
    const msPerDay = 86_400_000;
    const dayOffset =
      (now.getTime() - timelineStart.getTime()) / msPerDay;
    const pxPerDay = ZOOM_UNIT_PX[zoomLevel] / (zoomLevel === "day" ? 1 : zoomLevel === "week" ? 7 : zoomLevel === "month" ? 30 : 90);
    return dayOffset * pxPerDay;
  }, [timelineStart, zoomLevel]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (allCollapsed) {
      setCollapsedIds(new Set());
      setAllCollapsed(false);
    } else {
      const allIds = new Set<string>();
      const collectIds = (items: GanttIssueRow[]) => {
        for (const item of items) {
          if (item.children.length > 0) {
            allIds.add(item.id);
            collectIds(item.children);
          }
        }
      };
      collectIds(rows);
      setCollapsedIds(allIds);
      setAllCollapsed(true);
    }
  }, [allCollapsed, rows]);

  const handlePrevPeriod = useCallback(() => {
    if (timelineRef.current) {
      const scrollAmount = ZOOM_UNIT_PX[zoomLevel] * 2;
      timelineRef.current.scrollLeft = Math.max(
        0,
        timelineRef.current.scrollLeft - scrollAmount,
      );
    }
  }, [zoomLevel]);

  const handleNextPeriod = useCallback(() => {
    if (timelineRef.current) {
      const scrollAmount = ZOOM_UNIT_PX[zoomLevel] * 2;
      timelineRef.current.scrollLeft += scrollAmount;
    }
  }, [zoomLevel]);

  const handleGoToToday = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [todayOffset]);

  if (isLoading) {
    return <GanttSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<GanttIcon className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
        action={
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  if (visibleRows.length === 0) {
    return (
      <EmptyState
        icon={<GanttIcon className="size-12" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Controls toolbar */}
        <GanttControls
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onPrevPeriod={handlePrevPeriod}
          onNextPeriod={handleNextPeriod}
          onGoToToday={handleGoToToday}
          onToggleCollapse={handleToggleAll}
          allCollapsed={allCollapsed}
          onExport={() => {
            // Placeholder: export as image
          }}
        />

        {/* Main content: left panel + timeline */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: issue list */}
          <div
            className="shrink-0 overflow-y-auto border-r"
            style={{ width: LEFT_PANEL_WIDTH }}
            role="tree"
            aria-label={t("issueList")}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 flex h-10 items-center border-b bg-muted/50 px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("issue")}
              </span>
            </div>

            {/* Issue rows */}
            {visibleRows.map((row) => (
              <div
                key={row.id}
                role="treeitem"
                aria-selected={false}
                aria-expanded={
                  row.children.length > 0
                    ? !collapsedIds.has(row.id)
                    : undefined
                }
                aria-level={row.depth + 1}
                className="flex items-center border-b px-3 hover:bg-muted/30"
                style={{
                  height: ROW_HEIGHT,
                  paddingInlineStart: `${12 + row.depth * 20}px`,
                }}
              >
                {/* Expand/collapse toggle */}
                {row.children.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 shrink-0"
                    onClick={() => toggleCollapse(row.id)}
                    aria-label={
                      collapsedIds.has(row.id) ? t("expand") : t("collapse")
                    }
                  >
                    {collapsedIds.has(row.id) ? (
                      <ChevronRight
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                ) : (
                  <span className="size-5 shrink-0" />
                )}

                {/* Issue key and summary */}
                <span className="ms-1.5 shrink-0 text-xs font-medium text-primary">
                  {row.issueKey}
                </span>
                <span className="ms-2 truncate text-xs text-foreground">
                  {row.summary}
                </span>

                {/* Status badge */}
                <span className="ms-auto shrink-0">
                  <StatusBadge
                    name={row.statusName}
                    category={row.statusCategory}
                    className="text-[10px]"
                  />
                </span>
              </div>
            ))}
          </div>

          {/* Right panel: timeline */}
          <div
            ref={timelineRef}
            className="flex-1 overflow-auto"
            role="region"
            aria-label={t("timeline")}
          >
            {/* Timeline header */}
            <div className="sticky top-0 z-10 flex h-10 border-b bg-muted/50">
              {timelineHeaders.map((header, idx) => (
                <div
                  key={idx}
                  className="shrink-0 border-r px-2 text-center text-xs font-medium leading-10 text-muted-foreground"
                  style={{ width: header.widthPx }}
                >
                  {header.label}
                </div>
              ))}
            </div>

            {/* Timeline body with bars */}
            <div
              className="relative"
              style={{
                width: totalTimelineWidth,
                height: visibleRows.length * ROW_HEIGHT,
              }}
            >
              {/* Grid lines */}
              {timelineHeaders.map((header, idx) => {
                const offset = timelineHeaders
                  .slice(0, idx)
                  .reduce((s, h) => s + h.widthPx, 0);
                return (
                  <div
                    key={`grid-${idx}`}
                    className="absolute top-0 bottom-0 border-r border-muted/40"
                    style={{ left: offset }}
                  />
                );
              })}

              {/* Row backgrounds */}
              {visibleRows.map((_, idx) => (
                <div
                  key={`row-bg-${idx}`}
                  className={cn(
                    "absolute w-full border-b",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                  )}
                  style={{
                    top: idx * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                  }}
                />
              ))}

              {/* Today line */}
              {todayOffset > 0 && todayOffset < totalTimelineWidth && (
                <div
                  className="absolute top-0 bottom-0 z-20 w-0.5 bg-red-500"
                  style={{ left: todayOffset }}
                  aria-label={t("today")}
                >
                  <div className="absolute -top-0.5 -left-1.5 size-3 rounded-full bg-red-500" />
                </div>
              )}

              {/* Gantt bars */}
              {visibleRows.map((row, idx) => {
                if (!row.startDate || !row.endDate) return null;
                const { offsetPx, widthPx } = computeBarMetrics(
                  row.startDate,
                  row.endDate,
                  timelineStart,
                  zoomLevel,
                );

                const barData: GanttBarData = {
                  id: row.id,
                  issueKey: row.issueKey,
                  summary: row.summary,
                  startDate: row.startDate,
                  endDate: row.endDate,
                  progress: row.progress,
                  statusCategory: row.statusCategory,
                };

                return (
                  <div
                    key={row.id}
                    className="absolute"
                    style={{
                      top: idx * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                      width: totalTimelineWidth,
                    }}
                  >
                    <GanttBar
                      bar={barData}
                      offsetPx={offsetPx}
                      widthPx={widthPx}
                    />
                  </div>
                );
              })}

              {/* Dependency arrows (SVG overlay) */}
              {dependencies.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    width: totalTimelineWidth,
                    height: visibleRows.length * ROW_HEIGHT,
                  }}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="gantt-arrowhead"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 3, 0 6"
                        className="fill-muted-foreground"
                      />
                    </marker>
                  </defs>
                  {dependencies.map((dep) => {
                    const sourceIdx = visibleRows.findIndex(
                      (r) => r.id === dep.sourceId,
                    );
                    const targetIdx = visibleRows.findIndex(
                      (r) => r.id === dep.targetId,
                    );
                    if (sourceIdx === -1 || targetIdx === -1) return null;

                    const sourceRow = visibleRows[sourceIdx]!;
                    const targetRow = visibleRows[targetIdx]!;
                    if (!sourceRow.startDate || !sourceRow.endDate) return null;
                    if (!targetRow.startDate || !targetRow.endDate) return null;

                    const sourceMetrics = computeBarMetrics(
                      sourceRow.startDate,
                      sourceRow.endDate,
                      timelineStart,
                      zoomLevel,
                    );
                    const targetMetrics = computeBarMetrics(
                      targetRow.startDate,
                      targetRow.endDate,
                      timelineStart,
                      zoomLevel,
                    );

                    const x1 = sourceMetrics.offsetPx + sourceMetrics.widthPx;
                    const y1 =
                      sourceIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const x2 = targetMetrics.offsetPx;
                    const y2 =
                      targetIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                    return (
                      <path
                        key={dep.id}
                        d={`M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        className="stroke-muted-foreground"
                        strokeWidth={1.5}
                        markerEnd="url(#gantt-arrowhead)"
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Skeleton loading state for the Gantt chart.
 */
function GanttSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Controls skeleton */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-8" />
      </div>

      <div className="flex flex-1">
        {/* Left panel skeleton */}
        <div className="w-[360px] shrink-0 border-r">
          <div className="h-10 border-b bg-muted/50 px-3">
            <Skeleton className="mt-3 h-4 w-16" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 border-b px-3" style={{ height: 36 }}>
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="ms-auto h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Timeline skeleton */}
        <div className="flex-1">
          <div className="flex h-10 border-b bg-muted/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-[120px] shrink-0 border-r px-2">
                <Skeleton className="mt-3 mx-auto h-4 w-12" />
              </div>
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => {
            const paddingOffsets = [40, 75, 25, 90, 55, 30, 80, 60];
            const widthValues = [180, 120, 220, 150, 200, 100, 160, 140];
            return (
              <div
                key={i}
                className="border-b"
                style={{ height: 36, paddingTop: 6, paddingLeft: paddingOffsets[i % 8] }}
              >
                <Skeleton
                  className="h-6 rounded-sm"
                  style={{ width: widthValues[i % 8] }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

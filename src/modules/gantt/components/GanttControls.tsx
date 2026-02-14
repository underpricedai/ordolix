"use client";

import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  ZoomIn,
  ZoomOut,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * Zoom level options for the Gantt timeline.
 */
export type ZoomLevel = "day" | "week" | "month" | "quarter";

interface GanttControlsProps {
  /** Currently selected zoom level */
  zoomLevel: ZoomLevel;
  /** Callback when zoom level changes */
  onZoomChange: (level: ZoomLevel) => void;
  /** Navigate to previous time period */
  onPrevPeriod: () => void;
  /** Navigate to next time period */
  onNextPeriod: () => void;
  /** Scroll to today line */
  onGoToToday: () => void;
  /** Toggle collapse/expand all issue rows */
  onToggleCollapse: () => void;
  /** Whether all rows are currently collapsed */
  allCollapsed: boolean;
  /** Optional assignee filter value */
  filterAssignee?: string;
  /** Callback when assignee filter changes */
  onFilterAssigneeChange?: (value: string) => void;
  /** Optional epic filter value */
  filterEpic?: string;
  /** Callback when epic filter changes */
  onFilterEpicChange?: (value: string) => void;
  /** Optional status filter value */
  filterStatus?: string;
  /** Callback when status filter changes */
  onFilterStatusChange?: (value: string) => void;
  /** Callback for export as image */
  onExport?: () => void;
}

/**
 * GanttControls renders the toolbar for the Gantt chart view.
 *
 * @description Contains zoom level selector, date range navigation (prev/next),
 * go-to-today button, collapse/expand toggle, filter dropdowns, and export button.
 *
 * @param props - GanttControlsProps
 * @returns A horizontal toolbar component
 *
 * @example
 * <GanttControls
 *   zoomLevel="week"
 *   onZoomChange={setZoom}
 *   onPrevPeriod={handlePrev}
 *   onNextPeriod={handleNext}
 *   onGoToToday={handleToday}
 *   onToggleCollapse={toggleAll}
 *   allCollapsed={false}
 * />
 */
export function GanttControls({
  zoomLevel,
  onZoomChange,
  onPrevPeriod,
  onNextPeriod,
  onGoToToday,
  onToggleCollapse,
  allCollapsed,
  filterAssignee,
  onFilterAssigneeChange,
  filterEpic,
  onFilterEpicChange,
  filterStatus,
  onFilterStatusChange,
  onExport,
}: GanttControlsProps) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b px-4 py-2"
      role="toolbar"
      aria-label={t("controls")}
    >
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => {
            const levels: ZoomLevel[] = ["day", "week", "month", "quarter"];
            const idx = levels.indexOf(zoomLevel);
            if (idx > 0) onZoomChange(levels[idx - 1]!);
          }}
          disabled={zoomLevel === "day"}
          aria-label={t("zoomIn")}
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </Button>

        <Select
          value={zoomLevel}
          onValueChange={(val) => onZoomChange(val as ZoomLevel)}
        >
          <SelectTrigger
            className="h-8 w-[100px] text-xs"
            aria-label={t("zoomLevel")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t("zoomDay")}</SelectItem>
            <SelectItem value="week">{t("zoomWeek")}</SelectItem>
            <SelectItem value="month">{t("zoomMonth")}</SelectItem>
            <SelectItem value="quarter">{t("zoomQuarter")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => {
            const levels: ZoomLevel[] = ["day", "week", "month", "quarter"];
            const idx = levels.indexOf(zoomLevel);
            if (idx < levels.length - 1) onZoomChange(levels[idx + 1]!);
          }}
          disabled={zoomLevel === "quarter"}
          aria-label={t("zoomOut")}
        >
          <ZoomOut className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onPrevPeriod}
          aria-label={t("prevPeriod")}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onGoToToday}
        >
          <CalendarDays className="mr-1.5 size-3.5" aria-hidden="true" />
          {t("today")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onNextPeriod}
          aria-label={t("nextPeriod")}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Collapse/expand toggle */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={onToggleCollapse}
        aria-label={allCollapsed ? t("expandAll") : t("collapseAll")}
      >
        <ChevronsUpDown className="mr-1.5 size-3.5" aria-hidden="true" />
        {allCollapsed ? t("expandAll") : t("collapseAll")}
      </Button>

      {/* Filters */}
      <div className="flex items-center gap-2 ms-auto">
        {onFilterAssigneeChange && (
          <Select
            value={filterAssignee ?? "all"}
            onValueChange={onFilterAssigneeChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={t("filterAssignee")}>
              <SelectValue placeholder={t("filterAssignee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onFilterEpicChange && (
          <Select
            value={filterEpic ?? "all"}
            onValueChange={onFilterEpicChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={t("filterEpic")}>
              <SelectValue placeholder={t("filterEpic")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onFilterStatusChange && (
          <Select
            value={filterStatus ?? "all"}
            onValueChange={onFilterStatusChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={t("filterStatus")}>
              <SelectValue placeholder={t("filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Export button */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onExport}
            aria-label={tc("export")}
          >
            <Download className="mr-1.5 size-3.5" aria-hidden="true" />
            {tc("export")}
          </Button>
        )}
      </div>
    </div>
  );
}

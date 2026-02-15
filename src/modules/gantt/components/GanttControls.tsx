"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Filter,
  List,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useIsMobile } from "@/shared/hooks/use-mobile";

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
  /** Callback to open the issue list sheet on mobile */
  onShowIssueList?: () => void;
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
  onShowIssueList,
}: GanttControlsProps) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters = onFilterAssigneeChange || onFilterEpicChange || onFilterStatusChange;

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b px-2 py-2 sm:gap-2 sm:px-4"
      role="toolbar"
      aria-label={t("controls")}
    >
      {/* Mobile issue list button */}
      {isMobile && onShowIssueList && (
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onShowIssueList}
          aria-label={t("issueList")}
        >
          <List className="size-4" aria-hidden="true" />
        </Button>
      )}

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
            className={isMobile ? "h-8 w-[72px] text-xs" : "h-8 w-[100px] text-xs"}
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
          size={isMobile ? "icon" : "sm"}
          className={isMobile ? "size-8" : "h-8 text-xs"}
          onClick={onGoToToday}
          aria-label={t("today")}
        >
          <CalendarDays className={isMobile ? "size-4" : "mr-1.5 size-3.5"} aria-hidden="true" />
          {!isMobile && t("today")}
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
        size={isMobile ? "icon" : "sm"}
        className={isMobile ? "size-8" : "h-8 text-xs"}
        onClick={onToggleCollapse}
        aria-label={allCollapsed ? t("expandAll") : t("collapseAll")}
      >
        <ChevronsUpDown className={isMobile ? "size-4" : "mr-1.5 size-3.5"} aria-hidden="true" />
        {!isMobile && (allCollapsed ? t("expandAll") : t("collapseAll"))}
      </Button>

      {/* Filters and export */}
      <div className="flex items-center gap-1 ms-auto sm:gap-2">
        {/* Mobile: filter icon → Sheet */}
        {isMobile && hasFilters && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setFiltersOpen(true)}
              aria-label={tc("filter")}
            >
              <Filter className="size-4" aria-hidden="true" />
            </Button>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetContent side="bottom" className="max-h-[60vh]">
                <SheetHeader>
                  <SheetTitle>{tc("filter")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 p-4">
                  {onFilterAssigneeChange && (
                    <Select value={filterAssignee ?? "all"} onValueChange={onFilterAssigneeChange}>
                      <SelectTrigger className="h-10 text-sm" aria-label={t("filterAssignee")}>
                        <SelectValue placeholder={t("filterAssignee")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {onFilterEpicChange && (
                    <Select value={filterEpic ?? "all"} onValueChange={onFilterEpicChange}>
                      <SelectTrigger className="h-10 text-sm" aria-label={t("filterEpic")}>
                        <SelectValue placeholder={t("filterEpic")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {onFilterStatusChange && (
                    <Select value={filterStatus ?? "all"} onValueChange={onFilterStatusChange}>
                      <SelectTrigger className="h-10 text-sm" aria-label={t("filterStatus")}>
                        <SelectValue placeholder={t("filterStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}

        {/* Desktop filters */}
        {!isMobile && onFilterAssigneeChange && (
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

        {!isMobile && onFilterEpicChange && (
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

        {!isMobile && onFilterStatusChange && (
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
            size={isMobile ? "icon" : "sm"}
            className={isMobile ? "size-8" : "h-8 text-xs"}
            onClick={onExport}
            aria-label={tc("export")}
          >
            <Download className={isMobile ? "size-4" : "mr-1.5 size-3.5"} aria-hidden="true" />
            {!isMobile && tc("export")}
          </Button>
        )}
      </div>
    </div>
  );
}

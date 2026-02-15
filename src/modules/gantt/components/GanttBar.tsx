"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { StatusCategory } from "@/shared/components/status-badge";

/**
 * Data shape for a single Gantt bar representing an issue on the timeline.
 */
export interface GanttBarData {
  id: string;
  issueKey: string;
  summary: string;
  startDate: string;
  endDate: string;
  progress: number;
  statusCategory: StatusCategory;
  assignee?: string;
}

interface GanttBarProps {
  /** The bar data for this timeline entry */
  bar: GanttBarData;
  /** Pixel offset from the left edge of the timeline */
  offsetPx: number;
  /** Width of the bar in pixels */
  widthPx: number;
  /** Pixels per day, used to convert drag deltas to date changes */
  pxPerDay?: number;
  /** Callback when the bar is resized via edge dragging */
  onResize?: (id: string, newStartDate: string, newEndDate: string) => void;
  /** Callback when the bar is moved (dragged from the body) */
  onMove?: (id: string, newStartDate: string, newEndDate: string) => void;
}

/**
 * Adds a number of days to a date string, returning a new ISO date string (YYYY-MM-DD).
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0]!;
}

const categoryColors: Record<StatusCategory, string> = {
  TO_DO: "bg-muted-foreground/40 dark:bg-muted-foreground/50",
  IN_PROGRESS: "bg-blue-500 dark:bg-blue-600",
  DONE: "bg-green-500 dark:bg-green-600",
};

const categoryProgressColors: Record<StatusCategory, string> = {
  TO_DO: "bg-muted-foreground/60 dark:bg-muted-foreground/70",
  IN_PROGRESS: "bg-blue-700 dark:bg-blue-400",
  DONE: "bg-green-700 dark:bg-green-400",
};

/**
 * GanttBar renders a single horizontal bar on the Gantt timeline.
 *
 * @description Displays a bar spanning from start to end date, color-coded by
 * status category. Shows a progress fill overlay. Supports drag-to-resize on
 * left and right edges to adjust start/end dates. Tooltip on hover shows details.
 *
 * @param props - GanttBarProps
 * @returns A styled, interactive timeline bar element
 *
 * @example
 * <GanttBar bar={barData} offsetPx={120} widthPx={200} onResize={handleResize} />
 */
export function GanttBar({ bar, offsetPx, widthPx, pxPerDay = 17.14, onResize, onMove }: GanttBarProps) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"start" | "end" | "move" | null>(null);

  /**
   * Handles edge resize dragging (left or right handle).
   * On mouseup, computes the day delta from the pixel offset and calls onResize.
   */
  const handleResizeMouseDown = useCallback(
    (edge: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(edge);

      const startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // Drag feedback is visual only; actual resize computes on mouseup
        if (barRef.current) {
          const delta = moveEvent.clientX - startX;
          if (edge === "end") {
            barRef.current.style.width = `${Math.max(24, widthPx + delta)}px`;
          } else {
            const newWidth = Math.max(24, widthPx - delta);
            barRef.current.style.width = `${newWidth}px`;
            barRef.current.style.left = `${offsetPx + (widthPx - newWidth)}px`;
          }
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsDragging(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const delta = upEvent.clientX - startX;
        const dayDelta = Math.round(delta / pxPerDay);

        // Reset inline styles
        if (barRef.current) {
          barRef.current.style.width = "";
          barRef.current.style.left = "";
        }

        // Only fire callback if the drag actually changed dates
        if (dayDelta !== 0 && onResize) {
          if (edge === "start") {
            const newStart = addDays(bar.startDate, dayDelta);
            // Prevent start from going past end
            if (new Date(newStart) < new Date(bar.endDate)) {
              onResize(bar.id, newStart, bar.endDate);
            }
          } else {
            const newEnd = addDays(bar.endDate, dayDelta);
            // Prevent end from going before start
            if (new Date(newEnd) > new Date(bar.startDate)) {
              onResize(bar.id, bar.startDate, newEnd);
            }
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [offsetPx, widthPx, pxPerDay, onResize, bar.id, bar.startDate, bar.endDate],
  );

  /**
   * Handles whole-bar move dragging (drag from the bar body).
   * On mouseup, computes the day delta from the pixel offset and calls onMove.
   */
  const handleMoveMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left-click, and only if we're not on a resize handle
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.getAttribute("role") === "separator") return;

      e.preventDefault();
      setIsDragging("move");

      const startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (barRef.current) {
          const delta = moveEvent.clientX - startX;
          barRef.current.style.left = `${offsetPx + delta}px`;
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsDragging(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const delta = upEvent.clientX - startX;
        const dayDelta = Math.round(delta / pxPerDay);

        // Reset inline styles
        if (barRef.current) {
          barRef.current.style.left = "";
        }

        if (dayDelta !== 0 && onMove) {
          const newStart = addDays(bar.startDate, dayDelta);
          const newEnd = addDays(bar.endDate, dayDelta);
          onMove(bar.id, newStart, newEnd);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [offsetPx, pxPerDay, onMove, bar.id, bar.startDate, bar.endDate],
  );

  const formattedStart = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(bar.startDate));
  const formattedEnd = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(bar.endDate));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={barRef}
          role="listitem"
          aria-label={`${bar.issueKey}: ${bar.summary}`}
          className={cn(
            "group absolute top-1 h-7 rounded-sm transition-shadow hover:shadow-md",
            categoryColors[bar.statusCategory],
            isDragging === "move" && "cursor-grabbing shadow-lg ring-2 ring-primary",
            isDragging && isDragging !== "move" && "shadow-lg ring-2 ring-primary",
            !isDragging && onMove && "cursor-grab",
          )}
          style={{
            left: `${offsetPx}px`,
            width: `${Math.max(widthPx, 24)}px`,
          }}
          onMouseDown={handleMoveMouseDown}
        >
          {/* Progress fill */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-sm transition-all",
              categoryProgressColors[bar.statusCategory],
            )}
            style={{ width: `${Math.min(bar.progress, 100)}%` }}
            aria-label={`${bar.progress}% ${tc("details")}`}
          />

          {/* Bar label (visible on wider bars) */}
          <span className="relative z-10 truncate px-2 text-xs font-medium leading-7 text-white select-none">
            {widthPx > 80 ? bar.issueKey : ""}
          </span>

          {/* Left resize handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resizeStart")}
            className="absolute inset-y-0 left-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeMouseDown("start")}
          />

          {/* Right resize handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resizeEnd")}
            className="absolute inset-y-0 right-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeMouseDown("end")}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">
            {bar.issueKey}: {bar.summary}
          </p>
          <p className="text-xs">
            {formattedStart} &mdash; {formattedEnd}
          </p>
          <p className="text-xs">
            {t("progress")}: {bar.progress}%
          </p>
          {bar.assignee && (
            <p className="text-xs">
              {tc("details")}: {bar.assignee}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

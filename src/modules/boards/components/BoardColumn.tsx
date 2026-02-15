"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { BoardCard, type BoardCardIssue } from "./BoardCard";

/**
 * Data shape for a Kanban column.
 */
export interface BoardColumnData {
  id: string;
  name: string;
  statusIds: string[];
  color?: string;
  issues: BoardCardIssue[];
  minLimit?: number;
  maxLimit?: number;
}

interface BoardColumnProps {
  /** Column data including issues */
  column: BoardColumnData;
  /** Callback when an issue is dropped onto this column */
  onDrop?: (issueId: string, issueKey: string, fromStatusId: string, targetColumnId: string, targetStatusIds: string[]) => void;
  /** Callback when quick-add creates an issue */
  onQuickCreate?: (columnId: string, summary: string) => void;
  /** Callback when a card drag starts */
  onCardDragStart?: (e: React.DragEvent, issue: BoardCardIssue) => void;
  /** Callback when a card drag ends */
  onCardDragEnd?: (e: React.DragEvent) => void;
  /** Callback when a card is clicked */
  onCardClick?: (issue: BoardCardIssue) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * BoardColumn renders a single Kanban column with header, scrollable card list,
 * drop target highlighting, collapse/expand, and quick-add functionality.
 *
 * @description Supports HTML drag and drop. When issues are dragged over,
 * the column highlights as a drop target. The column can be collapsed to
 * save horizontal space.
 *
 * @param props - BoardColumnProps
 * @returns A column component for the Kanban board
 *
 * @example
 * <BoardColumn column={columnData} onDrop={handleDrop} />
 */
export function BoardColumn({
  column,
  onDrop,
  onQuickCreate,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  className,
}: BoardColumnProps) {
  const t = useTranslations("boards");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");

  const issueCount = column.issues.length;
  const isWipExceeded = column.maxLimit != null && issueCount > column.maxLimit;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && (e.currentTarget as HTMLElement).contains(relatedTarget)) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const rawData = e.dataTransfer.getData("application/ordolix-issue");
      if (!rawData) return;

      try {
        const data = JSON.parse(rawData) as {
          id: string;
          key: string;
          statusId: string;
        };
        // Don't drop onto the same column
        if (column.statusIds.includes(data.statusId)) return;

        onDrop?.(data.id, data.key, data.statusId, column.id, column.statusIds);
      } catch {
        // Invalid drag data, ignore
      }
    },
    [column.id, column.statusIds, onDrop],
  );

  const handleQuickAdd = useCallback(() => {
    const summary = quickAddValue.trim();
    if (!summary) return;
    onQuickCreate?.(column.id, summary);
    setQuickAddValue("");
    setIsQuickAddOpen(false);
  }, [quickAddValue, column.id, onQuickCreate]);

  const handleQuickAddKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleQuickAdd();
      } else if (e.key === "Escape") {
        setIsQuickAddOpen(false);
        setQuickAddValue("");
      }
    },
    [handleQuickAdd],
  );

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex w-10 shrink-0 flex-col items-center rounded-lg bg-muted/50 py-2",
          className,
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-7 mb-2"
          onClick={() => setIsCollapsed(false)}
          aria-label={t("expandColumn", { column: column.name })}
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
        <span
          className="text-xs font-semibold text-muted-foreground"
          style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
        >
          {column.name}
        </span>
        <Badge variant="secondary" className="mt-2 text-xs">
          {issueCount}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-[85vw] shrink-0 snap-center flex-col rounded-lg transition-colors sm:w-72 sm:snap-align-none",
        isDragOver
          ? "bg-primary/5 ring-2 ring-primary/30 dark:bg-primary/10"
          : "bg-muted/50",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="list"
      aria-label={column.name}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={() => setIsCollapsed(true)}
            aria-label={t("collapseColumn", { column: column.name })}
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </Button>
          {column.color && (
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: column.color }}
              aria-hidden="true"
            />
          )}
          <h3 className="text-sm font-semibold text-foreground truncate">
            {column.name}
          </h3>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              isWipExceeded && "bg-destructive/10 text-destructive",
            )}
          >
            {isWipExceeded
              ? t("wipExceeded", { count: issueCount, limit: column.maxLimit ?? 0 })
              : issueCount}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setIsQuickAddOpen(true)}
          aria-label={t("addToColumn", { column: column.name })}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Issue cards */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-2 px-2 pb-2" role="listitem">
          {issueCount === 0 ? (
            <div
              className={cn(
                "flex min-h-[120px] items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
                isDragOver
                  ? "border-primary/40 bg-primary/5"
                  : "border-muted-foreground/20",
              )}
            >
              <p className="text-xs text-muted-foreground">{t("dropHere")}</p>
            </div>
          ) : (
            column.issues.map((issue) => (
              <BoardCard
                key={issue.id}
                issue={issue}
                onDragStart={onCardDragStart}
                onDragEnd={onCardDragEnd}
                onClick={onCardClick}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick-add at bottom */}
      <div className="px-2 pb-2">
        {isQuickAddOpen ? (
          <div className="flex flex-col gap-1.5">
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              placeholder={t("summaryPlaceholder")}
              className="h-8 text-sm"
              aria-label={t("createQuickIssue")}
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleQuickAdd}
                disabled={!quickAddValue.trim()}
              >
                {t("createQuickIssue")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  setQuickAddValue("");
                }}
              >
                <span className="sr-only">{t("createQuickIssue")}</span>
                &times;
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start text-xs text-muted-foreground"
            onClick={() => setIsQuickAddOpen(true)}
          >
            <Plus className="mr-1 size-3" aria-hidden="true" />
            {t("createQuickIssue")}
          </Button>
        )}
      </div>
    </div>
  );
}

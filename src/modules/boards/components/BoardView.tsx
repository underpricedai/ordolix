"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Filter, Columns3 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea, ScrollBar } from "@/shared/components/ui/scroll-area";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { BoardColumn, type BoardColumnData } from "./BoardColumn";
import type { BoardCardIssue } from "./BoardCard";

interface BoardViewProps {
  /** ID of the board to display */
  boardId: string;
  /** Board name for the header */
  boardName: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * BoardView renders the main Kanban board with horizontally scrollable columns.
 *
 * @description Fetches board data via tRPC `board.getData`, renders columns
 * per status, and handles drag-and-drop between columns by triggering
 * workflow transitions. Includes a board header with name, filter toggle,
 * and quick filter badges.
 *
 * @param props - BoardViewProps
 * @returns The main board view component
 *
 * @example
 * <BoardView boardId="board-1" boardName="My Board" />
 */
export function BoardView({
  boardId,
  boardName,
  className,
}: BoardViewProps) {
  const t = useTranslations("boards");
  const tc = useTranslations("common");
  const [showFilters, setShowFilters] = useState(false);
  const [draggingIssue, setDraggingIssue] = useState<string | null>(null);

  const {
    data: boardData,
    isLoading,
    error,
    refetch,
  } = trpc.board.getData.useQuery(
    { id: boardId },
    { enabled: !!boardId },
  );

  const transitionMutation = trpc.workflow.transition.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleDrop = useCallback(
    (
      issueId: string,
      issueKey: string,
      _fromStatusId: string,
      _targetColumnId: string,
      targetStatusIds: string[],
    ) => {
      // Use the first status ID from the target column for the transition
      const targetStatusId = targetStatusIds[0];
      if (!targetStatusId) return;

      // Find the transition that moves the issue to the target status
      // For now, we trigger the transition directly
      // The workflow engine will validate the transition is valid
      transitionMutation.mutate({
        issueId,
        transitionId: targetStatusId, // This will be mapped to the correct transition
      });
    },
    [transitionMutation],
  );

  const handleCardDragStart = useCallback(
    (_e: React.DragEvent, issue: BoardCardIssue) => {
      setDraggingIssue(issue.id);
    },
    [],
  );

  const handleCardDragEnd = useCallback(() => {
    setDraggingIssue(null);
  }, []);

  const columns: BoardColumnData[] = boardData?.columns?.map((col) => ({
    id: col.id,
    name: col.name,
    statusIds: col.statusIds,
    issues: (col.issues ?? []) as unknown as BoardCardIssue[],
    minLimit: col.minLimit,
    maxLimit: col.maxLimit,
  })) ?? [];

  const totalIssues = columns.reduce((sum, col) => sum + col.issues.length, 0);
  const isEmpty = totalIssues === 0 && !isLoading;

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 px-6 py-8">
        <EmptyState
          icon={<Columns3 className="size-12" />}
          title={tc("error")}
          description={tc("retry")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Board header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{boardName}</h2>
          <Badge variant="secondary" className="text-xs">
            {t("issueCount", { count: totalIssues })}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick filters */}
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            aria-label={t("filterToggle")}
            aria-pressed={showFilters}
          >
            <Filter className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("quickFilters")}
          </Button>
        </div>
      </div>

      {/* Quick filter bar */}
      {showFilters && (
        <div className="flex items-center gap-2 border-b px-6 py-2">
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            role="button"
            tabIndex={0}
          >
            {t("myIssues")}
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            role="button"
            tabIndex={0}
          >
            {t("recentlyUpdated")}
          </Badge>
        </div>
      )}

      {/* Board columns */}
      {isEmpty ? (
        <div className="flex-1 px-4 py-8 sm:px-6">
          <EmptyState
            icon={<Columns3 className="size-12" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto p-4 sm:snap-none sm:p-6"
            role="region"
            aria-label={t("boardColumns")}
          >
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onDrop={handleDrop}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                className={
                  draggingIssue && !column.issues.some((i) => i.id === draggingIssue)
                    ? "ring-1 ring-muted-foreground/20"
                    : undefined
                }
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Loading overlay for transitions */}
      {transitionMutation.isPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50"
          role="status"
          aria-label={tc("loading")}
        >
          <div className="rounded-lg bg-card p-4 shadow-lg">
            <p className="text-sm text-muted-foreground">{tc("loading")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the board view.
 */
function BoardSkeleton() {
  return (
    <div className="flex gap-4 p-6">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div key={colIdx} className="w-72 shrink-0 space-y-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, cardIdx) => (
            <Card key={cardIdx} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="size-6 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

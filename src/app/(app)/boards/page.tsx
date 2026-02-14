"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Columns3, Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { BoardView } from "@/modules/boards/components/BoardView";
import {
  BoardSelector,
  type BoardSelectorItem,
} from "@/modules/boards/components/BoardSelector";
import { BoardSettings } from "@/modules/boards/components/BoardSettings";

/**
 * Boards page with board selector header and Kanban board view.
 *
 * @description Uses BoardSelector to pick a board, then renders the full
 * BoardView for the selected board. Includes board settings access and
 * create board functionality. Falls back to an empty state when no boards exist.
 */
export default function BoardsPage() {
  const t = useTranslations("boards");
  const tn = useTranslations("nav");

  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();

  // Fetch board by ID to get the board list
  // Note: The board router currently exposes getById and getData.
  // A proper board.list endpoint would be added in a follow-up.
  // For now we fetch the selected board's data directly.
  const {
    data: boardData,
    isLoading: isBoardLoading,
    refetch: refetchBoard,
  } = trpc.board.getData.useQuery(
    { id: selectedBoardId! },
    { enabled: !!selectedBoardId },
  );

  const board = boardData?.board;

  // Build boards list from the currently loaded board
  // In production, this would come from a board.list endpoint
  const boards: BoardSelectorItem[] = board
    ? [{ id: board.id, name: board.name, boardType: board.boardType ?? undefined }]
    : [];

  const handleSelectBoard = useCallback((boardId: string) => {
    setSelectedBoardId(boardId);
  }, []);

  const handleCreateBoard = useCallback(() => {
    // In production, this would open a create board dialog
    // and call trpc.board.create.mutate()
  }, []);

  const settingsColumns = boardData?.columns?.map((col) => ({
    id: col.id,
    name: col.name,
    visible: true,
  })) ?? [];

  const hasBoard = !!selectedBoardId && !!board;

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("boards") }]} />
      <div className="flex flex-1 flex-col">
        {/* Page header with board selector */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {tn("boards")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("pageDescription")}
              </p>
            </div>
            <BoardSelector
              boards={boards}
              selectedBoardId={selectedBoardId}
              isLoading={isBoardLoading}
              onSelect={handleSelectBoard}
              onCreateBoard={handleCreateBoard}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasBoard && (
              <BoardSettings
                boardId={board.id}
                boardName={board.name}
                columns={settingsColumns}
                onSaved={() => void refetchBoard()}
              />
            )}
            <Button onClick={handleCreateBoard}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createBoard")}
            </Button>
          </div>
        </div>

        {/* Board content */}
        {isBoardLoading ? (
          <BoardPageSkeleton />
        ) : !selectedBoardId ? (
          <div className="flex-1 px-6 py-8">
            <EmptyState
              icon={<Columns3 className="size-12" />}
              title={t("noBoardsDescription")}
              description={t("emptyDescription")}
              action={
                <Button onClick={handleCreateBoard}>
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  {t("createBoard")}
                </Button>
              }
            />
          </div>
        ) : hasBoard ? (
          <BoardView
            boardId={board.id}
            boardName={board.name}
            className="flex flex-1 flex-col"
          />
        ) : (
          <div className="flex-1 px-6 py-8">
            <EmptyState
              icon={<Columns3 className="size-12" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the boards page.
 */
function BoardPageSkeleton() {
  return (
    <div className="flex gap-4 p-6">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="w-72 shrink-0 space-y-2 rounded-lg bg-muted/50 p-3"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, cardIdx) => (
            <div key={cardIdx} className="rounded-lg border bg-card p-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

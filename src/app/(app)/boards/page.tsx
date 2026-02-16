"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Columns3, FolderOpen, Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ActionTooltip } from "@/shared/components/action-tooltip";
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
 * @description Fetches projects to determine available boards, allows board
 * selection, and renders the full BoardView for the selected board.
 * Includes board settings access and a create board dialog.
 */
export default function BoardsPage() {
  const t = useTranslations("boards");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardType, setNewBoardType] = useState<"kanban" | "scrum">("kanban");
  const [newBoardProjectId, setNewBoardProjectId] = useState<string | undefined>();

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } =
    trpc.project.list.useQuery({ limit: 50 });
  const projects = projectsData?.items ?? [];
  const firstProjectId = projects[0]?.id;
  const effectiveProjectId = newBoardProjectId ?? firstProjectId;

  // Fetch boards for the first project
  const {
    data: boardsList,
    isLoading: boardsLoading,
    refetch: refetchBoards,
  } = trpc.board.listByProject.useQuery(
    { projectId: firstProjectId! },
    { enabled: !!firstProjectId },
  );

  // Auto-select first board when boards load
  const boards: BoardSelectorItem[] = (boardsList ?? []).map(
    (b: { id: string; name: string; boardType?: string | null }) => ({
      id: b.id,
      name: b.name,
      boardType: b.boardType ?? undefined,
    }),
  );

  const activeBoardId = selectedBoardId ?? boards[0]?.id;

  // Fetch selected board data
  const {
    data: boardData,
    isLoading: isBoardLoading,
    refetch: refetchBoard,
  } = trpc.board.getData.useQuery(
    { id: activeBoardId! },
    { enabled: !!activeBoardId },
  );

  const board = boardData?.board;

  // Create board mutation
  const createBoardMutation = trpc.board.create.useMutation({
    onSuccess: (newBoard) => {
      setCreateDialogOpen(false);
      setNewBoardName("");
      setNewBoardType("kanban");
      setSelectedBoardId(newBoard.id);
      void refetchBoards();
    },
  });

  const handleSelectBoard = useCallback((boardId: string) => {
    setSelectedBoardId(boardId);
  }, []);

  const handleCreateBoard = useCallback(() => {
    setNewBoardProjectId(firstProjectId);
    setCreateDialogOpen(true);
  }, [firstProjectId]);

  const handleSubmitCreateBoard = useCallback(() => {
    if (!effectiveProjectId || !newBoardName.trim()) return;
    createBoardMutation.mutate({
      projectId: effectiveProjectId,
      name: newBoardName.trim(),
      boardType: newBoardType,
    });
  }, [createBoardMutation, effectiveProjectId, newBoardName, newBoardType]);

  const settingsColumns =
    boardData?.columns?.map((col: { id: string; name: string }) => ({
      id: col.id,
      name: col.name,
      visible: true,
    })) ?? [];

  const hasBoard = !!activeBoardId && !!board;
  const isLoading = projectsLoading || boardsLoading;

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("boards") }]} />
        <BoardPageSkeleton />
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("boards") }]} />
        <div className="flex-1 px-6 py-8">
          <EmptyState
            icon={<FolderOpen className="size-12" />}
            title="No projects yet"
            description="Create a project first to set up boards."
          />
        </div>
      </>
    );
  }

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
              selectedBoardId={activeBoardId}
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
            <ActionTooltip content={t("createBoardTooltip")}>
              <Button onClick={handleCreateBoard}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createBoard")}
              </Button>
            </ActionTooltip>
          </div>
        </div>

        {/* Board content */}
        {isBoardLoading ? (
          <BoardPageSkeleton />
        ) : !activeBoardId || boards.length === 0 ? (
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

      {/* Create Board Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createBoard")}</DialogTitle>
            <DialogDescription>
              Create a new board for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-name">{tc("name")}</Label>
              <Input
                id="board-name"
                placeholder="e.g., Sprint Board"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitCreateBoard();
                }}
              />
            </div>
            {projects.length > 1 && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={effectiveProjectId} onValueChange={setNewBoardProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: { id: string; name: string }) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("boardType")}</Label>
              <Select
                value={newBoardType}
                onValueChange={(v) => setNewBoardType(v as "kanban" | "scrum")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="scrum">Scrum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSubmitCreateBoard}
              disabled={!newBoardName.trim() || createBoardMutation.isPending}
            >
              {createBoardMutation.isPending ? tc("loading") : t("createBoard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

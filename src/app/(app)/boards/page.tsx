"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Columns3, FolderOpen, Plus, Filter } from "lucide-react";
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
import { Badge } from "@/shared/components/ui/badge";
import { ActionTooltip } from "@/shared/components/action-tooltip";
import { trpc } from "@/shared/lib/trpc";
import { BoardView } from "@/modules/boards/components/BoardView";
import {
  BoardSelector,
  type BoardSelectorItem,
} from "@/modules/boards/components/BoardSelector";
import { BoardSettings } from "@/modules/boards/components/BoardSettings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BoardWithProject = any;

/**
 * Boards page with board selector header and Kanban board view.
 *
 * @description Fetches ALL boards across all projects, allows filtering by project,
 * board selection, and renders the full BoardView for the selected board.
 * Includes board settings access and a create board dialog.
 */
export default function BoardsPage() {
  const t = useTranslations("boards");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardType, setNewBoardType] = useState<"kanban" | "scrum">("kanban");
  const [newBoardProjectId, setNewBoardProjectId] = useState<string | undefined>();

  // Fetch projects for filter dropdown & create dialog
  const { data: projectsData, isLoading: projectsLoading } =
    trpc.project.list.useQuery({ limit: 50 });
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);

  // Fetch ALL boards across all projects
  const {
    data: allBoardsList,
    isLoading: boardsLoading,
    refetch: refetchBoards,
  } = trpc.board.listAll.useQuery();

  // Filter boards by selected project
  const filteredBoards = useMemo(() => {
    const allBoards: BoardWithProject[] = allBoardsList ?? [];
    if (filterProjectId === "all") return allBoards;
    return allBoards.filter((b: BoardWithProject) => b.projectId === filterProjectId);
  }, [allBoardsList, filterProjectId]);

  // Build selector items with project name
  const boards: BoardSelectorItem[] = filteredBoards.map(
    (b: BoardWithProject) => ({
      id: b.id,
      name: b.project ? `${b.name} (${b.project.key})` : b.name,
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
    setNewBoardProjectId(projects[0]?.id);
    setCreateDialogOpen(true);
  }, [projects]);

  const handleSubmitCreateBoard = useCallback(() => {
    const projectId = newBoardProjectId ?? projects[0]?.id;
    if (!projectId || !newBoardName.trim()) return;
    createBoardMutation.mutate({
      projectId,
      name: newBoardName.trim(),
      boardType: newBoardType,
    });
  }, [createBoardMutation, newBoardProjectId, projects, newBoardName, newBoardType]);

  const settingsColumns =
    boardData?.columns?.map((col: { id: string; name: string }) => ({
      id: col.id,
      name: col.name,
      visible: true,
    })) ?? [];

  const hasBoard = !!activeBoardId && !!board;
  const isLoading = projectsLoading || boardsLoading;
  const totalBoardCount = (allBoardsList ?? []).length;

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
        {/* Page header with board selector and project filter */}
        <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {tn("boards")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("pageDescription")}
                {" "}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalBoardCount} {totalBoardCount === 1 ? "board" : "boards"}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Project filter */}
            <ActionTooltip content={t("filterByProject")}>
              <div className="flex items-center gap-1.5">
                <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
                <Select value={filterProjectId} onValueChange={(v) => {
                  setFilterProjectId(v);
                  setSelectedBoardId(undefined); // reset board selection on filter change
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={tc("all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc("all")} {tn("projects")}</SelectItem>
                    {projects.map((p: { id: string; name: string; key: string }) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ActionTooltip>

            {/* Board selector */}
            <BoardSelector
              boards={boards}
              selectedBoardId={activeBoardId}
              isLoading={isBoardLoading}
              onSelect={handleSelectBoard}
              onCreateBoard={handleCreateBoard}
            />

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
            <div className="space-y-2">
              <Label>{tc("project")}</Label>
              <Select value={newBoardProjectId ?? projects[0]?.id} onValueChange={setNewBoardProjectId}>
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

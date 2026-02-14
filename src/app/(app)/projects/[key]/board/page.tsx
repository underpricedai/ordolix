/**
 * Project-scoped board page.
 *
 * @description Shows the Kanban board for a specific project. Renders the
 * BoardView component with the project's board data. Uses AppHeader with
 * breadcrumbs showing the project key.
 *
 * @module project-board-page
 */
"use client";

import { use, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Columns3, Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { BoardView } from "@/modules/boards/components/BoardView";

export default function ProjectBoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.board");
  const tn = useTranslations("nav");

  // TODO: Replace with tRPC board.getByProject query once available
  const [selectedBoardId] = useState<string | undefined>();
  const isLoading = false;

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("boards") },
  ];

  const handleCreateBoard = useCallback(() => {
    // In production, this would open a create board dialog
  }, []);

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex gap-4 p-6">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="w-72 shrink-0 space-y-2 rounded-lg bg-muted/50 p-3"
            >
              <Skeleton className="h-5 w-24" />
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
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Button onClick={handleCreateBoard}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createBoard")}
          </Button>
        </div>

        {/* Board content */}
        {selectedBoardId ? (
          <BoardView
            boardId={selectedBoardId}
            boardName={`${key.toUpperCase()} Board`}
            className="flex flex-1 flex-col"
          />
        ) : (
          <div className="flex-1 px-6 py-8">
            <EmptyState
              icon={<Columns3 className="size-12" />}
              title={t("noBoard")}
              description={t("noBoardDescription")}
              action={
                <Button onClick={handleCreateBoard}>
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  {t("createBoard")}
                </Button>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}

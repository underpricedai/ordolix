import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Kanban board skeleton with three column placeholders.
 *
 * @description Mimics the BoardView layout with column headers,
 * WIP badges, and card skeletons inside each column.
 */
export default function BoardsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto p-6">
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="w-72 shrink-0 space-y-2 rounded-lg bg-muted/50 p-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="space-y-2 rounded-lg border bg-card p-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

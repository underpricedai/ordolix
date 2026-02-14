import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Gantt chart skeleton with issue list and timeline placeholders.
 *
 * @description Mimics the GanttChart layout with a toolbar,
 * a left-side issue list, and right-side timeline bars.
 */
export default function GanttLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-6 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>

      {/* Timeline area */}
      <div className="flex flex-1">
        {/* Issue list */}
        <div className="w-64 shrink-0 space-y-3 border-r p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        {/* Timeline bars */}
        <div className="flex-1 space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton
                className="h-6 rounded"
                style={{ width: `${30 + (i % 3) * 20}%`, marginLeft: `${(i * 7) % 40}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

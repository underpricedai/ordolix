import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Admin panel skeleton with stat cards and content areas.
 *
 * @description Mimics the admin dashboard layout with a page header,
 * a 4-column stat grid, and two-column content area.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-48" />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-5 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Two-column content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

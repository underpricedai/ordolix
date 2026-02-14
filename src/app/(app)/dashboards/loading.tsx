import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Dashboard skeleton with widget grid placeholders.
 *
 * @description Mimics the DashboardView layout with a header area
 * and a responsive grid of widget cards in various sizes.
 */
export default function DashboardsLoading() {
  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Widget grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Large widget */}
        <Skeleton className="h-48 rounded-lg sm:col-span-2" />
        {/* Small widgets */}
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

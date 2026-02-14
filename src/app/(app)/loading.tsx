import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Generic full-page skeleton loading state for the app layout.
 *
 * @description Displays a header skeleton and content area placeholder
 * while the page is loading via React Suspense.
 */
export default function AppLoading() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content area skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";

/**
 * Configuration for the grid layout.
 */
export interface DashboardGridConfig {
  /** Number of columns at each breakpoint */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between grid items in Tailwind spacing units */
  gap?: number;
}

interface DashboardGridProps {
  /** Child widget components to render in the grid */
  children: React.ReactNode;
  /** Grid layout configuration */
  config?: DashboardGridConfig;
  /** Whether the grid is loading */
  isLoading?: boolean;
  /** Whether the grid is empty (no widgets) */
  isEmpty?: boolean;
  /** Callback to add a widget when the grid is empty */
  onAddWidget?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

const DEFAULT_CONFIG: DashboardGridConfig = {
  columns: { sm: 1, md: 2, lg: 3, xl: 4 },
  gap: 4,
};

/**
 * Maps column counts to Tailwind grid-cols classes at each breakpoint.
 */
const colClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/**
 * DashboardGrid renders a responsive CSS grid layout for dashboard widgets.
 *
 * @description Accepts widget components as children and arranges them in a
 * configurable responsive grid. Shows a skeleton loader while loading and an
 * empty state when there are no widgets.
 *
 * @param props - DashboardGridProps
 * @returns A responsive grid layout component
 *
 * @example
 * <DashboardGrid config={{ columns: { md: 2, lg: 3 } }}>
 *   <IssuesByStatusWidget />
 *   <RecentActivityWidget />
 *   <MyIssuesWidget />
 * </DashboardGrid>
 */
export function DashboardGrid({
  children,
  config = DEFAULT_CONFIG,
  isLoading = false,
  isEmpty = false,
  onAddWidget,
  className,
}: DashboardGridProps) {
  const t = useTranslations("dashboards");

  if (isLoading) {
    return <DashboardGridSkeleton config={config} />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="size-12" />}
        title={t("emptyDashboard")}
        description={t("emptyDashboardDescription")}
        action={
          onAddWidget ? (
            <Button onClick={onAddWidget}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("addWidget")}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const cols = { ...DEFAULT_CONFIG.columns, ...config.columns };
  const gapClass = `gap-${config.gap ?? DEFAULT_CONFIG.gap}`;

  return (
    <div
      className={cn(
        "grid",
        gapClass,
        colClasses[cols.sm ?? 1],
        cols.md && `md:${colClasses[cols.md]}`,
        cols.lg && `lg:${colClasses[cols.lg]}`,
        cols.xl && `xl:${colClasses[cols.xl]}`,
        className,
      )}
      role="region"
      aria-label={t("widgetGrid")}
    >
      {children}
    </div>
  );
}

/**
 * Skeleton loading state for DashboardGrid.
 */
function DashboardGridSkeleton({
  config = DEFAULT_CONFIG,
}: {
  config?: DashboardGridConfig;
}) {
  const cols = { ...DEFAULT_CONFIG.columns, ...config.columns };
  const gapClass = `gap-${config.gap ?? DEFAULT_CONFIG.gap}`;

  return (
    <div
      className={cn(
        "grid",
        gapClass,
        colClasses[cols.sm ?? 1],
        cols.md && `md:${colClasses[cols.md]}`,
        cols.lg && `lg:${colClasses[cols.lg]}`,
        cols.xl && `xl:${colClasses[cols.xl]}`,
      )}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="size-6" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j}>
                <div className="mb-1 flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

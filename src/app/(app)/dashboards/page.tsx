"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { LayoutDashboard, LayoutList, Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { DashboardView } from "@/modules/dashboards/components/DashboardView";
import { DashboardSelector } from "@/modules/dashboards/components/DashboardSelector";
import { trpc } from "@/shared/lib/trpc";

/**
 * Dashboard item shape from the list API.
 */
interface DashboardItem {
  id: string;
  name: string;
  isShared: boolean;
  widgetCount: number;
  updatedAt: string;
}

/**
 * Dashboards page with a sidebar selector and main dashboard view.
 *
 * @description Shows a dashboard picker in a side sheet and renders the selected
 * dashboard's widgets in the main content area. Loads available dashboards via
 * tRPC and auto-selects the first one. If no dashboards exist, shows an empty state.
 */
export default function DashboardsPage() {
  const t = useTranslations("dashboards");
  const tn = useTranslations("nav");

  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const { data: dashboardsData, isLoading } = trpc.dashboard.list.useQuery(
    undefined,
    { enabled: true },
  );

  const dashboards: DashboardItem[] = useMemo(
    () => (dashboardsData as { items?: DashboardItem[] })?.items ?? [],
    [dashboardsData],
  );

  // Resolve the active dashboard: user selection takes priority, otherwise first available
  const activeDashboardId = useMemo(() => {
    if (selectedDashboardId && dashboards.some((d) => d.id === selectedDashboardId)) {
      return selectedDashboardId;
    }
    return dashboards[0]?.id ?? null;
  }, [selectedDashboardId, dashboards]);

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("dashboard") }]} />
      <div className="flex-1 p-6">
        {/* Page header with dashboard selector trigger */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>

          {/* Dashboard picker sheet */}
          <Sheet open={selectorOpen} onOpenChange={setSelectorOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <LayoutList className="mr-2 size-4" aria-hidden="true" />
                {t("switchDashboard")}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>{t("selectDashboard")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <DashboardSelector
                  activeDashboardId={activeDashboardId ?? undefined}
                  onSelect={(id) => {
                    setSelectedDashboardId(id);
                    setSelectorOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Dashboard content */}
        {isLoading ? (
          <DashboardPageSkeleton />
        ) : dashboards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="size-12" />}
            title={t("noDashboards")}
            description={t("noDashboardsDescription")}
            action={
              <Button onClick={() => setSelectorOpen(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createDashboard")}
              </Button>
            }
          />
        ) : activeDashboardId ? (
          <DashboardView dashboardId={activeDashboardId} />
        ) : null}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the dashboard page.
 */
function DashboardPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

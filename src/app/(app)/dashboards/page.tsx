"use client";

import { useState } from "react";
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
import { LayoutList } from "lucide-react";
import { DashboardView } from "@/modules/dashboards/components/DashboardView";
import { DashboardSelector } from "@/modules/dashboards/components/DashboardSelector";

/**
 * Dashboards page with a sidebar selector and main dashboard view.
 *
 * @description Shows a dashboard picker in a side sheet and renders the selected
 * dashboard's widgets in the main content area. Supports switching between
 * personal and shared dashboards.
 */
export default function DashboardsPage() {
  const t = useTranslations("dashboards");
  const tn = useTranslations("nav");

  const [activeDashboardId, setActiveDashboardId] = useState<string>("default");
  const [selectorOpen, setSelectorOpen] = useState(false);

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
                  activeDashboardId={activeDashboardId}
                  onSelect={(id) => {
                    setActiveDashboardId(id);
                    setSelectorOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Dashboard content */}
        <DashboardView dashboardId={activeDashboardId} />
      </div>
    </>
  );
}

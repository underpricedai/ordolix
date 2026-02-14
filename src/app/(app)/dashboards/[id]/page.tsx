/**
 * Dashboard detail page.
 *
 * @description Shows a specific dashboard by ID. Renders the DashboardView
 * component with the dashboard ID from the URL parameter.
 *
 * @module dashboard-detail-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { DashboardView } from "@/modules/dashboards/components/DashboardView";

export default function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tn = useTranslations("nav");

  const breadcrumbs = [
    { label: tn("dashboard"), href: "/dashboards" },
    { label: id },
  ];

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 p-6">
        <DashboardView dashboardId={id} />
      </div>
    </>
  );
}

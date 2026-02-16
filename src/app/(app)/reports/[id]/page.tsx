/**
 * Report detail page.
 *
 * @description Renders the ReportBuilder in edit mode for a specific report,
 * allowing users to view, edit, and run saved reports.
 *
 * @module report-detail-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { ReportBuilder } from "@/modules/reports/components/ReportBuilder";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tn = useTranslations("nav");

  const breadcrumbs = [
    { label: tn("reports"), href: "/reports" },
    { label: id },
  ];

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 p-4 sm:p-6">
        <ReportBuilder reportId={id} />
      </div>
    </>
  );
}

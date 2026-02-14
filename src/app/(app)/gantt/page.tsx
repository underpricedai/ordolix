"use client";

import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { GanttChart } from "@/modules/gantt/components/GanttChart";

/**
 * Gantt chart page displaying the interactive project timeline.
 *
 * @description Renders the AppHeader with breadcrumbs and the full GanttChart
 * component. Uses a default projectId until project context is available.
 */
export default function GanttPage() {
  const tn = useTranslations("nav");
  const t = useTranslations("gantt");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("gantt") }]} />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
        </div>
        <GanttChart projectId="default" />
      </div>
    </>
  );
}

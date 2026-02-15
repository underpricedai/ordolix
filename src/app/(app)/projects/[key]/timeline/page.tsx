/**
 * Project-scoped timeline page.
 *
 * @description Shows the Gantt chart timeline for a specific project.
 * Renders the GanttChart component with the project key as context.
 *
 * @module project-timeline-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { GanttChart } from "@/modules/gantt/components/GanttChart";
import { trpc } from "@/shared/lib/trpc";

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.timeline");
  const tn = useTranslations("nav");

  const { data: project, isLoading } = trpc.project.getByKey.useQuery({ key });

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("timeline") },
  ];

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : project?.id ? (
          <GanttChart projectId={project.id} />
        ) : null}
      </div>
    </>
  );
}

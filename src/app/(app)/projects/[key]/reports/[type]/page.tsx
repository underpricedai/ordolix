/**
 * Project-scoped report detail page.
 *
 * @description Renders the appropriate chart widget based on the report type
 * parameter (velocity, burndown, cumulative-flow, sprint, created-vs-resolved).
 *
 * @module project-report-type-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { BurndownWidget } from "@/modules/dashboards/components/BurndownWidget";
import { VelocityTrendWidget } from "@/modules/dashboards/components/VelocityTrendWidget";
import { CumulativeFlowWidget } from "@/modules/dashboards/components/CumulativeFlowWidget";
import { trpc } from "@/shared/lib/trpc";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Map report type slugs to display info */
const REPORT_TYPES: Record<string, { titleKey: string; descriptionKey: string }> = {
  velocity: { titleKey: "velocity", descriptionKey: "velocityDescription" },
  burndown: { titleKey: "burndown", descriptionKey: "burndownDescription" },
  "cumulative-flow": { titleKey: "cumulativeFlow", descriptionKey: "cumulativeFlowDescription" },
  sprint: { titleKey: "sprintReport", descriptionKey: "sprintReportDescription" },
  "created-vs-resolved": { titleKey: "createdVsResolved", descriptionKey: "createdVsResolvedDescription" },
};

export default function ProjectReportTypePage({
  params,
}: {
  params: Promise<{ key: string; type: string }>;
}) {
  const { key, type } = use(params);
  const t = useTranslations("projectPages.reports");
  const tn = useTranslations("nav");

  const { data: project, isLoading } = trpc.project.getByKey.useQuery({ key });

  const reportMeta = REPORT_TYPES[type];
  const title = reportMeta ? t(reportMeta.titleKey) : type;
  const description = reportMeta ? t(reportMeta.descriptionKey) : "";

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: project?.name ?? key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("reports"), href: `/projects/${key}/reports` },
    { label: title },
  ];

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-6 p-6">
        {/* Header with back link */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${key}/reports`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {/* Chart area */}
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[400px]">
            <ReportChart type={type} projectId={project?.id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/**
 * Renders the appropriate chart component based on report type.
 */
function ReportChart({ type, projectId }: { type: string; projectId?: string }) {
  const t = useTranslations("projectPages.reports");

  if (!projectId) {
    return <p className="text-muted-foreground">{t("noData")}</p>;
  }

  // Sample data — will be replaced with real data from report endpoints
  const velocityData = [
    { sprint: "Sprint 1", committed: 20, completed: 18 },
    { sprint: "Sprint 2", committed: 25, completed: 22 },
    { sprint: "Sprint 3", committed: 22, completed: 20 },
    { sprint: "Sprint 4", committed: 28, completed: 26 },
    { sprint: "Sprint 5", committed: 24, completed: 24 },
  ];

  const burndownData = [
    { day: "Day 1", remaining: 30, ideal: 30 },
    { day: "Day 2", remaining: 28, ideal: 27 },
    { day: "Day 3", remaining: 24, ideal: 24 },
    { day: "Day 4", remaining: 22, ideal: 21 },
    { day: "Day 5", remaining: 18, ideal: 18 },
    { day: "Day 6", remaining: 15, ideal: 15 },
    { day: "Day 7", remaining: 12, ideal: 12 },
    { day: "Day 8", remaining: 8, ideal: 9 },
    { day: "Day 9", remaining: 4, ideal: 6 },
    { day: "Day 10", remaining: 0, ideal: 3 },
  ];

  const cumulativeData = [
    { date: "Week 1", todo: 20, inProgress: 5, done: 2 },
    { date: "Week 2", todo: 18, inProgress: 8, done: 6 },
    { date: "Week 3", todo: 14, inProgress: 10, done: 12 },
    { date: "Week 4", todo: 10, inProgress: 8, done: 18 },
  ];

  const cumulativeStatuses = [
    { key: "todo", name: "To Do", color: "#94a3b8" },
    { key: "inProgress", name: "In Progress", color: "#3b82f6" },
    { key: "done", name: "Done", color: "#22c55e" },
  ];

  switch (type) {
    case "velocity":
      return <VelocityTrendWidget data={velocityData} />;
    case "burndown":
      return <BurndownWidget data={burndownData} />;
    case "cumulative-flow":
      return <CumulativeFlowWidget data={cumulativeData} statuses={cumulativeStatuses} />;
    case "sprint":
      return (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
          {t("sprintReportPlaceholder")}
        </div>
      );
    case "created-vs-resolved":
      return (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
          {t("createdVsResolvedPlaceholder")}
        </div>
      );
    default:
      return (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
          {t("unknownReportType")}
        </div>
      );
  }
}

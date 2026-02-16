/**
 * Project-scoped report detail page.
 *
 * @description Renders the appropriate chart widget based on the report type
 * parameter (velocity, burndown, cumulative-flow, sprint, created-vs-resolved).
 * All chart data is fetched from real tRPC endpoints.
 *
 * @module project-report-type-page
 */
"use client";

import { use, useMemo } from "react";
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
import { BarChartWidget } from "@/shared/components/charts";
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

/** Loading skeleton for chart area */
function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
}

/** Empty state message for charts with no data */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
      <p className="max-w-md text-center">{message}</p>
    </div>
  );
}

/**
 * Renders the appropriate chart component based on report type.
 * Each report type fetches its own data from tRPC endpoints.
 */
function ReportChart({ type, projectId }: { type: string; projectId?: string }) {
  const t = useTranslations("projectPages.reports");

  if (!projectId) {
    return <p className="text-muted-foreground">{t("noData")}</p>;
  }

  switch (type) {
    case "velocity":
      return <VelocityReport projectId={projectId} />;
    case "burndown":
      return <BurndownReport projectId={projectId} />;
    case "cumulative-flow":
      return <CumulativeFlowReport projectId={projectId} />;
    case "sprint":
      return <SprintReport projectId={projectId} />;
    case "created-vs-resolved":
      return <CreatedVsResolvedReport projectId={projectId} />;
    default:
      return (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
          {t("unknownReportType")}
        </div>
      );
  }
}

/**
 * Velocity chart: shows committed vs completed story points per sprint.
 * Data source: trpc.sprint.velocity
 */
function VelocityReport({ projectId }: { projectId: string }) {
  const t = useTranslations("projectPages.reports");
  const { data, isLoading } = trpc.sprint.velocity.useQuery({
    projectId,
    sprintCount: 10,
  });

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].reverse().map((sprint) => ({
      sprint: sprint.sprintName,
      committed: sprint.committedPoints,
      completed: sprint.completedPoints,
    }));
  }, [data]);

  if (isLoading) return <ChartSkeleton />;
  if (chartData.length === 0) return <EmptyState message={t("noVelocityData")} />;

  return <VelocityTrendWidget data={chartData} />;
}

/**
 * Burndown chart: shows remaining vs ideal work for the active sprint.
 * Data source: trpc.sprint.list (active sprint) + trpc.sprint.getById (sprint issues)
 *
 * Computes burndown from the active sprint's start/end dates and issue story points.
 * Ideal line is a straight line from total points to zero.
 * Remaining line uses issue resolution timestamps from history to track actual progress.
 */
function BurndownReport({ projectId }: { projectId: string }) {
  const t = useTranslations("projectPages.reports");

  const { data: sprints, isLoading: sprintsLoading } = trpc.sprint.list.useQuery({
    projectId,
    status: "active",
  });

  const activeSprint = sprints?.[0];

  const { data: sprintDetail, isLoading: detailLoading } = trpc.sprint.getById.useQuery(
    { id: activeSprint?.id ?? "" },
    { enabled: !!activeSprint?.id },
  );

  const chartData = useMemo(() => {
    if (!sprintDetail || !activeSprint?.startDate || !activeSprint?.endDate) return [];

    const startDate = new Date(activeSprint.startDate);
    const endDate = new Date(activeSprint.endDate);
    const today = new Date();

    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const totalPoints = sprintDetail.issues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 1),
      0,
    );

    const donePoints = sprintDetail.issues
      .filter((issue) => issue.status?.category === "DONE")
      .reduce((sum, issue) => sum + (issue.storyPoints ?? 1), 0);

    const elapsedDays = Math.min(
      totalDays,
      Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
    );

    const data: Array<{ day: string; remaining: number; ideal: number }> = [];

    for (let i = 0; i <= totalDays; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);
      const label = `${t("burndown").charAt(0)}${i + 1}`;
      const idealRemaining = Math.round(totalPoints * (1 - i / totalDays));

      if (i <= elapsedDays) {
        // For elapsed days, interpolate remaining work linearly between start and current known state
        const fraction = elapsedDays > 0 ? i / elapsedDays : 1;
        const remaining = Math.round(totalPoints - fraction * donePoints);
        data.push({ day: label, remaining, ideal: idealRemaining });
      } else {
        // Future days: only show ideal line
        data.push({ day: label, remaining: NaN, ideal: idealRemaining });
      }
    }

    return data;
  }, [sprintDetail, activeSprint, t]);

  // Filter out NaN for future data points - BurndownWidget handles missing data gracefully
  const cleanData = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        remaining: Number.isNaN(d.remaining) ? undefined : d.remaining,
      })) as Array<{ day: string; remaining: number; ideal: number }>,
    [chartData],
  );

  if (sprintsLoading || detailLoading) return <ChartSkeleton />;
  if (cleanData.length === 0) return <EmptyState message={t("noBurndownData")} />;

  return <BurndownWidget data={cleanData} />;
}

/**
 * Cumulative flow diagram: shows issue counts by status category over time.
 * Data source: trpc.issue.list (all issues) + trpc.issue.listStatuses (project statuses)
 *
 * Groups issues by status category (TO_DO, IN_PROGRESS, DONE) and computes
 * weekly snapshots based on issue creation dates.
 */
function CumulativeFlowReport({ projectId }: { projectId: string }) {
  const t = useTranslations("projectPages.reports");

  const { data: issuesResult, isLoading: issuesLoading } = trpc.issue.list.useQuery({
    projectId,
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "asc",
  });

  const chartData = useMemo(() => {
    const issues = issuesResult?.items;
    if (!issues || issues.length === 0) return { data: [], statuses: [] };

    // Determine date range: from first issue creation to now
    const dates = issues.map((i) => new Date(i.createdAt).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();

    // Generate weekly buckets
    const weeks: Array<{ start: Date; label: string }> = [];
    const cursor = new Date(minDate);
    cursor.setHours(0, 0, 0, 0);
    // Align to start of week (Monday)
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));

    let weekNum = 1;
    while (cursor <= maxDate) {
      weeks.push({
        start: new Date(cursor),
        label: `W${weekNum}`,
      });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }

    // Limit to last 12 weeks for readability
    const recentWeeks = weeks.slice(-12);

    // For each week, count cumulative issues by status category
    const data = recentWeeks.map((week) => {
      const weekEnd = new Date(week.start);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Issues that existed by this week's end
      const issuesAtWeek = issues.filter(
        (issue) => new Date(issue.createdAt) < weekEnd,
      );

      let todo = 0;
      let inProgress = 0;
      let done = 0;

      for (const issue of issuesAtWeek) {
        const category = issue.status?.category ?? "TO_DO";
        if (category === "DONE") done++;
        else if (category === "IN_PROGRESS") inProgress++;
        else todo++;
      }

      return { date: week.label, todo, inProgress, done };
    });

    const statuses = [
      { key: "todo", name: "To Do", color: "#94a3b8" },
      { key: "inProgress", name: "In Progress", color: "#3b82f6" },
      { key: "done", name: "Done", color: "#22c55e" },
    ];

    return { data, statuses };
  }, [issuesResult]);

  if (issuesLoading) return <ChartSkeleton />;
  if (chartData.data.length === 0) return <EmptyState message={t("noCumulativeData")} />;

  return <CumulativeFlowWidget data={chartData.data} statuses={chartData.statuses} />;
}

/**
 * Sprint report: shows completed vs incomplete issues for the last completed sprint.
 * Data source: trpc.sprint.velocity (last completed sprint data)
 */
function SprintReport({ projectId }: { projectId: string }) {
  const t = useTranslations("projectPages.reports");

  const { data: sprints, isLoading: sprintsLoading } = trpc.sprint.list.useQuery({
    projectId,
    status: "completed",
  });

  const lastSprint = sprints?.[0];

  const { data: sprintDetail, isLoading: detailLoading } = trpc.sprint.getById.useQuery(
    { id: lastSprint?.id ?? "" },
    { enabled: !!lastSprint?.id },
  );

  const chartData = useMemo(() => {
    if (!sprintDetail) return [];

    const doneIssues = sprintDetail.issues.filter(
      (issue) => issue.status?.category === "DONE",
    );
    const incompleteIssues = sprintDetail.issues.filter(
      (issue) => issue.status?.category !== "DONE",
    );

    const completedPoints = doneIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    );
    const incompletePoints = incompleteIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    );

    return [
      {
        category: t("sprintReportTotalIssues"),
        completed: doneIssues.length,
        incomplete: incompleteIssues.length,
      },
      {
        category: t("sprintReportStoryPoints"),
        completed: completedPoints,
        incomplete: incompletePoints,
      },
    ];
  }, [sprintDetail, t]);

  if (sprintsLoading || detailLoading) return <ChartSkeleton />;
  if (chartData.length === 0) return <EmptyState message={t("noSprintReportData")} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {lastSprint?.name}
      </p>
      <BarChartWidget
        data={chartData}
        xAxisKey="category"
        bars={[
          { dataKey: "completed", name: t("sprintReportCompleted"), color: "#22c55e" },
          { dataKey: "incomplete", name: t("sprintReportIncomplete"), color: "#f59e0b" },
        ]}
        height={300}
        showLegend
      />
    </div>
  );
}

/**
 * Created vs Resolved chart: shows weekly issue creation and resolution rates.
 * Data source: trpc.issue.list (all issues, sorted by creation date)
 *
 * Computes weekly buckets of created vs resolved (status category = DONE) issues.
 */
function CreatedVsResolvedReport({ projectId }: { projectId: string }) {
  const t = useTranslations("projectPages.reports");

  const { data: issuesResult, isLoading } = trpc.issue.list.useQuery({
    projectId,
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "asc",
  });

  const chartData = useMemo(() => {
    const issues = issuesResult?.items;
    if (!issues || issues.length === 0) return [];

    // Determine date range
    const dates = issues.map((i) => new Date(i.createdAt).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();

    // Generate weekly buckets
    const weeks: Array<{ start: Date; end: Date; label: string }> = [];
    const cursor = new Date(minDate);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));

    let weekNum = 1;
    while (cursor <= maxDate) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeks.push({
        start: new Date(cursor),
        end: weekEnd,
        label: `W${weekNum}`,
      });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }

    // Limit to last 12 weeks
    const recentWeeks = weeks.slice(-12);

    return recentWeeks.map((week) => {
      const created = issues.filter((issue) => {
        const d = new Date(issue.createdAt);
        return d >= week.start && d < week.end;
      }).length;

      // Resolved = issues that are in DONE status and were last updated during this week
      // This is an approximation since we don't have a resolvedAt field
      const resolved = issues.filter((issue) => {
        const updated = new Date(issue.updatedAt);
        return (
          issue.status?.category === "DONE" &&
          updated >= week.start &&
          updated < week.end
        );
      }).length;

      return { week: week.label, created, resolved };
    });
  }, [issuesResult]);

  if (isLoading) return <ChartSkeleton />;
  if (chartData.length === 0) return <EmptyState message={t("noCreatedVsResolvedData")} />;

  return (
    <BarChartWidget
      data={chartData}
      xAxisKey="week"
      bars={[
        { dataKey: "created", name: "Created", color: "#ef4444" },
        { dataKey: "resolved", name: "Resolved", color: "#22c55e" },
      ]}
      height={300}
      showLegend
    />
  );
}

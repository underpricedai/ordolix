/**
 * Project overview page.
 *
 * @description Shows a single project's summary stats as clickable cards,
 * recent issues with links, and team members. All panels navigate to
 * their corresponding detail views.
 *
 * @module project-detail-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  CircleDot,
  ArrowRight,
  Columns3,
  ListTodo,
  GanttChart,
  Timer,
  Inbox,
  BarChart3,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { trpc } from "@/shared/lib/trpc";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages");
  const tn = useTranslations("nav");

  const {
    data: project,
    isLoading,
  } = trpc.project.getByKey.useQuery({ key });

  // Fetch recent issues for this project
  const { data: issuesData } = trpc.issue.list.useQuery(
    { projectId: project?.id ?? "", limit: 5, sortBy: "updatedAt", sortOrder: "desc" },
    { enabled: !!project?.id },
  );

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: project?.name ?? key.toUpperCase() },
  ];

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </>
    );
  }

  const issueCount = project?._count?.issues ?? 0;
  const memberCount = project?._count?.members ?? 0;
  const recentIssues = issuesData?.items ?? [];

  /** Quick-nav cards for project sub-sections */
  const quickNavItems = [
    { icon: Columns3, label: tn("boards"), href: `/projects/${key}/board` },
    { icon: ListTodo, label: tn("backlog"), href: `/projects/${key}/backlog` },
    { icon: GanttChart, label: tn("timeline"), href: `/projects/${key}/timeline` },
    { icon: Timer, label: tn("sprints"), href: `/projects/${key}/sprints` },
    { icon: Inbox, label: tn("queue"), href: `/projects/${key}/queue` },
    { icon: BarChart3, label: tn("reports"), href: `/projects/${key}/reports` },
  ];

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-6 p-6">
        {/* Project header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {project?.name ?? key.toUpperCase()}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{project?.key ?? key.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">
              {project?.projectType ?? "Software"}
            </span>
          </div>
        </div>

        {/* Summary stat cards — all clickable */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href={`/projects/${key}/backlog`} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("openIssues")}
                </CardTitle>
                <CircleDot
                  className="size-5 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">{issueCount}</p>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects/${key}/backlog`} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("closedIssues")}
                </CardTitle>
                <CheckCircle2
                  className="size-5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">0</p>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects/${key}/settings`} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("teamMembers")}
                </CardTitle>
                <Users
                  className="size-5 text-purple-600 dark:text-purple-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">{memberCount}</p>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick navigation cards */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="transition-shadow group-hover:shadow-md">
                  <CardContent className="flex flex-col items-center gap-2 p-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Separator />

        {/* Recent issues and team members */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("recentIssues")}</CardTitle>
              <Link
                href={`/projects/${key}/backlog`}
                className="text-sm text-primary hover:underline"
              >
                {t("viewAll") ?? "View all"}
              </Link>
            </CardHeader>
            <CardContent>
              {recentIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noProjects")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentIssues.map(
                    (issue: {
                      id: string;
                      key: string;
                      summary: string;
                      status?: { name: string; category?: string } | null;
                      priority?: { name: string } | null;
                    }) => (
                      <li key={issue.id}>
                        <Link
                          href={`/issues/${issue.key}`}
                          className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {issue.key}
                            </Badge>
                            <span className="truncate text-sm">
                              {issue.summary}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {issue.priority && (
                              <Badge variant="secondary" className="text-xs">
                                {issue.priority.name}
                              </Badge>
                            )}
                            {issue.status && (
                              <Badge
                                variant={
                                  issue.status.category === "DONE"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {issue.status.name}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("teamMembers")}</CardTitle>
              <Link
                href={`/projects/${key}/settings`}
                className="text-sm text-primary hover:underline"
              >
                {t("manage") ?? "Manage"}
              </Link>
            </CardHeader>
            <CardContent>
              {project?.members && project.members.length > 0 ? (
                <ul className="space-y-1">
                  {project.members.map(
                    (m: {
                      user?: { id: string; name: string | null; email: string } | null;
                      id?: string;
                      projectRole?: { name: string } | null;
                    }) => (
                      <li
                        key={m.user?.id ?? m.id ?? "unknown"}
                        className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {(m.user?.name ?? m.user?.email ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm">
                            {m.user?.name ?? m.user?.email ?? "-"}
                          </span>
                        </div>
                        {m.projectRole && (
                          <Badge variant="secondary" className="text-xs">
                            {m.projectRole.name}
                          </Badge>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noProjects")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

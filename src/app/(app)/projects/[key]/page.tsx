/**
 * Project overview page.
 *
 * @description Shows a single project's summary stats, recent issues,
 * and team members. Provides navigation to project-specific boards,
 * backlogs, and settings.
 *
 * @module project-detail-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  CheckCircle2,
  CircleDot,
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

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("openIssues")}
              </CardTitle>
              <CircleDot
                className="size-5 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{issueCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("closedIssues")}
              </CardTitle>
              <CheckCircle2
                className="size-5 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("teamMembers")}
              </CardTitle>
              <Users
                className="size-5 text-purple-600 dark:text-purple-400"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{memberCount}</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Recent issues and team members */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("recentIssues")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {issueCount === 0 ? t("noProjects") : `${issueCount} issues in this project`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("teamMembers")}</CardTitle>
            </CardHeader>
            <CardContent>
              {project?.members && project.members.length > 0 ? (
                <ul className="space-y-2">
                  {project.members.map(
                    (m: { user?: { id: string; name: string | null; email: string } | null; id?: string }) => (
                      <li
                        key={m.user?.id ?? m.id ?? "unknown"}
                        className="text-sm text-muted-foreground"
                      >
                        {m.user?.name ?? m.user?.email ?? "-"}
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

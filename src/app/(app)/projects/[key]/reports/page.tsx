/**
 * Project-scoped reports page.
 *
 * @description Shows project-specific reports with links to velocity,
 * burndown, cumulative flow, sprint report, and created vs resolved charts.
 *
 * @module project-reports-page
 */
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  BarChart3,
  TrendingDown,
  Layers,
  FileText,
  GitCompareArrows,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

interface ReportLink {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  href: string;
}

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.reports");
  const tn = useTranslations("nav");

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("reports") },
  ];

  const reportLinks: ReportLink[] = [
    {
      titleKey: "velocity",
      descriptionKey: "velocityDescription",
      icon: <BarChart3 className="size-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />,
      href: `/projects/${key}/reports/velocity`,
    },
    {
      titleKey: "burndown",
      descriptionKey: "burndownDescription",
      icon: <TrendingDown className="size-6 text-green-600 dark:text-green-400" aria-hidden="true" />,
      href: `/projects/${key}/reports/burndown`,
    },
    {
      titleKey: "cumulativeFlow",
      descriptionKey: "cumulativeFlowDescription",
      icon: <Layers className="size-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />,
      href: `/projects/${key}/reports/cumulative-flow`,
    },
    {
      titleKey: "sprintReport",
      descriptionKey: "sprintReportDescription",
      icon: <FileText className="size-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />,
      href: `/projects/${key}/reports/sprint`,
    },
    {
      titleKey: "createdVsResolved",
      descriptionKey: "createdVsResolvedDescription",
      icon: <GitCompareArrows className="size-6 text-red-600 dark:text-red-400" aria-hidden="true" />,
      href: `/projects/${key}/reports/created-vs-resolved`,
    },
  ];

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {key.toUpperCase()} {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        {/* Report cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportLinks.map((report) => (
            <Link key={report.titleKey} href={report.href} className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    {report.icon}
                  </div>
                  <CardTitle className="text-base">
                    {t(report.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(report.descriptionKey)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

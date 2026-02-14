"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ListTodo,
  Columns3,
  GanttChart,
  Clock,
  BarChart3,
  Plus,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

/**
 * Dashboard overview cards linking to main features.
 */
const quickLinks = [
  { titleKey: "issues", href: "/issues", icon: ListTodo, descKey: "issuesDesc" },
  { titleKey: "boards", href: "/boards", icon: Columns3, descKey: "boardsDesc" },
  { titleKey: "gantt", href: "/gantt", icon: GanttChart, descKey: "ganttDesc" },
  { titleKey: "timeTracking", href: "/time-tracking", icon: Clock, descKey: "timeTrackingDesc" },
  { titleKey: "reports", href: "/reports", icon: BarChart3, descKey: "reportsDesc" },
];

/**
 * Dashboard home page for the authenticated app.
 *
 * @description Shows a welcome message and quick-link cards to main features.
 * Serves as the landing page after authentication.
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");

  return (
    <>
      <AppHeader
        breadcrumbs={[{ label: tn("dashboard") }]}
      />
      <div className="flex-1 space-y-6 p-6">
        {/* Welcome section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("welcome")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button asChild>
            <Link href="/issues">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createIssue")}
            </Link>
          </Button>
        </div>

        {/* Quick links grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="transition-shadow group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-base">{tn(link.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t(link.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

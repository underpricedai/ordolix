/**
 * Admin dashboard overview page.
 *
 * @description Shows summary cards for user count, project count,
 * active workflows, and storage used. Includes system health indicators
 * and a recent activity feed.
 *
 * @module admin-dashboard
 */
"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  FolderKanban,
  GitBranch,
  HardDrive,
  Activity,
  CheckCircle2,
  Database,
  Server,
  Mail,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Stat card configuration for the admin overview grid.
 */
const statCards = [
  { key: "totalUsers", icon: Users, color: "text-blue-600 dark:text-blue-400" },
  { key: "totalProjects", icon: FolderKanban, color: "text-green-600 dark:text-green-400" },
  { key: "activeWorkflows", icon: GitBranch, color: "text-purple-600 dark:text-purple-400" },
  { key: "storageUsed", icon: HardDrive, color: "text-orange-600 dark:text-orange-400" },
] as const;

/**
 * System health check items.
 */
const healthItems = [
  { key: "database", icon: Database },
  { key: "cache", icon: Server },
  { key: "storage", icon: HardDrive },
  { key: "email", icon: Mail },
] as const;

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");

  // TODO: Replace with tRPC admin.stats query once admin router is implemented
  const isLoading = false;

  const statValues: Record<string, string> = {
    totalUsers: "0",
    totalProjects: "0",
    activeWorkflows: "0",
    storageUsed: "0 MB",
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(card.key)}
                </CardTitle>
                <Icon
                  className={`size-5 ${card.color}`}
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {statValues[card.key]}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" aria-hidden="true" />
              {t("systemHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">
                        {t(item.key)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      <CheckCircle2
                        className="mr-1 size-3"
                        aria-hidden="true"
                      />
                      {t("healthy")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>
              {t("noRecentActivity")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">{t("noRecentActivity")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

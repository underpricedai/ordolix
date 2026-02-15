/**
 * Admin dashboard overview page.
 *
 * @description Shows summary cards for user count, project count,
 * active workflows, and issue count. Includes system health indicators
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
  ClipboardList,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  HardDrive,
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
import { trpc } from "@/shared/lib/trpc";

/**
 * Stat card configuration for the admin overview grid.
 */
const statCards = [
  { key: "totalUsers", dataKey: "userCount", icon: Users, color: "text-blue-600 dark:text-blue-400" },
  { key: "totalProjects", dataKey: "projectCount", icon: FolderKanban, color: "text-green-600 dark:text-green-400" },
  { key: "activeWorkflows", dataKey: "workflowCount", icon: GitBranch, color: "text-purple-600 dark:text-purple-400" },
  { key: "totalIssues", dataKey: "issueCount", icon: ClipboardList, color: "text-orange-600 dark:text-orange-400" },
] as const;

/**
 * System health check items mapped to getSystemHealth keys.
 */
const healthItems = [
  { key: "database", icon: Database },
  { key: "cache", icon: Server },
  { key: "queue", icon: HardDrive },
] as const;

/**
 * Returns the appropriate badge styling and icon for a health status.
 */
function getHealthBadge(status: string) {
  switch (status) {
    case "healthy":
      return {
        className: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
        Icon: CheckCircle2,
      };
    case "degraded":
      return {
        className: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        Icon: AlertTriangle,
      };
    default:
      return {
        className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400",
        Icon: XCircle,
      };
  }
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.admin.getDashboardStats.useQuery({});

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = trpc.admin.getSystemHealth.useQuery({});

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
          const value = stats ? String(stats[card.dataKey]) : "0";
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
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : statsError ? (
                  <p className="text-sm text-destructive">{t("errorLoading")}</p>
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {value}
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
            {healthLoading ? (
              <div className="space-y-3">
                {healthItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : healthError ? (
              <p className="text-sm text-destructive">{t("errorLoading")}</p>
            ) : (
              <div className="space-y-3">
                {healthItems.map((item) => {
                  const ItemIcon = item.icon;
                  const status = health?.[item.key as keyof typeof health] as string ?? "unknown";
                  const badge = getHealthBadge(status);
                  const BadgeIcon = badge.Icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <ItemIcon
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">
                          {t(item.key)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={badge.className}
                      >
                        <BadgeIcon
                          className="mr-1 size-3"
                          aria-hidden="true"
                        />
                        {t(status === "healthy" ? "healthy" : status)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
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

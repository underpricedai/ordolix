/**
 * Survey statistics dashboard panel.
 *
 * @description Displays aggregate CSAT metrics including average score,
 * total responses, star distribution bar chart, trend line chart,
 * and top/bottom agents performance table.
 *
 * @module SurveyStatsPanel
 */

"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Star, TrendingUp, Users, MessageSquare } from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StarRating } from "./StarRating";

/**
 * SurveyStatsPanel renders a dashboard with CSAT statistics.
 *
 * @returns A statistics dashboard component
 */
export function SurveyStatsPanel() {
  const t = useTranslations("surveys");
  const tc = useTranslations("common");

  const { data: stats, isLoading: statsLoading } = trpc.survey.getStats.useQuery();
  const { data: agents, isLoading: agentsLoading } = trpc.survey.getAgentPerformance.useQuery();

  if (statsLoading || agentsLoading) {
    return <StatsLoadingSkeleton />;
  }

  const distributionData = stats
    ? [1, 2, 3, 4, 5].map((star) => ({
        star: `${star}`,
        count: stats.distribution[star] ?? 0,
      }))
    : [];

  const trendData = stats?.trend ?? [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("avgRating")}</CardTitle>
            <Star className="size-4 text-amber-400" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {stats?.avgRating?.toFixed(2) ?? "0.00"}
              </span>
              <StarRating value={stats?.avgRating ?? 0} readonly size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("outOf5")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalResponses")}</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.totalResponses ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("ratedCount", { count: stats?.ratedResponses ?? 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("satisfactionRate")}</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats && stats.ratedResponses > 0
                ? `${Math.round(
                    (((stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0)) /
                      stats.ratedResponses) *
                      100,
                  )}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("satisfactionDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("topAgents")}</CardTitle>
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {agents?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("agentsWithFeedback")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ratingDistribution")}</CardTitle>
            <CardDescription>{t("ratingDistributionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="star"
                    tick={{ fontSize: 12 }}
                    label={{ value: t("stars"), position: "insideBottom", offset: -5, fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tc("noResults")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ratingTrend")}</CardTitle>
            <CardDescription>{t("ratingTrendDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avgRating"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tc("noResults")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      {agents && agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("agentPerformance")}</CardTitle>
            <CardDescription>{t("agentPerformanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {agents.map((agent: any) => (
                <div
                  key={agent.agent.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {agent.agent.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {agent.agent.name ?? t("unknownAgent")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("responseCountLabel", { count: agent.responseCount })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StarRating value={agent.avgRating} readonly size="sm" />
                    <span className="text-sm font-medium tabular-nums w-10 text-end">
                      {agent.avgRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { trpc } from "@/shared/lib/trpc";

const COLORS = {
  compliant: "#22c55e",
  overDeployed: "#ef4444",
  underUtilized: "#eab308",
} as const;

/**
 * LicenseComplianceWidget renders a Recharts donut chart for embedding in
 * dashboards. Shows compliant vs over-deployed vs under-utilized counts.
 *
 * @returns A compliance donut chart widget
 */
export function LicenseComplianceWidget() {
  const t = useTranslations("assets");

  const { data: dashboard, isLoading } = trpc.asset.getComplianceDashboard.useQuery();

  if (isLoading || !dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("compliance_dashboard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: t("compliance_compliant"), value: dashboard.compliant, color: COLORS.compliant },
    { name: t("compliance_over_deployed"), value: dashboard.overDeployed, color: COLORS.overDeployed },
    { name: t("compliance_under_utilized"), value: dashboard.underUtilized, color: COLORS.underUtilized },
  ].filter((d) => d.value > 0);

  const total = dashboard.totalLicenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("compliance_dashboard")}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("license_empty_title")}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-xs text-muted-foreground">{t("licenses")}</span>
              </div>
            </div>

            {/* Legend + Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="inline-block size-2 rounded-full bg-green-500 mr-1" />
                <span className="text-muted-foreground">{t("compliance_compliant")}</span>
                <div className="text-lg font-semibold text-foreground">{dashboard.compliant}</div>
              </div>
              <div>
                <div className="inline-block size-2 rounded-full bg-red-500 mr-1" />
                <span className="text-muted-foreground">{t("compliance_over_deployed")}</span>
                <div className="text-lg font-semibold text-foreground">{dashboard.overDeployed}</div>
              </div>
              <div>
                <div className="inline-block size-2 rounded-full bg-yellow-500 mr-1" />
                <span className="text-muted-foreground">{t("compliance_under_utilized")}</span>
                <div className="text-lg font-semibold text-foreground">{dashboard.underUtilized}</div>
              </div>
            </div>

            {/* Additional stats */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <div className="text-xs text-muted-foreground">{t("compliance_total_cost")}</div>
                <div className="text-sm font-semibold text-foreground">
                  {new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(dashboard.totalCost)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("compliance_expiring_soon")}</div>
                <div className="text-sm font-semibold text-foreground">{dashboard.expiringWithin30Days}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { trpc } from "@/shared/lib/trpc";

interface WarrantyAlertsBannerProps {
  /** Number of days ahead to check for expiring warranties. Defaults to 30. */
  daysAhead?: number;
}

/**
 * WarrantyAlertsBanner displays a dashboard-embeddable banner showing
 * the count of assets with warranties expiring soon.
 *
 * @description Uses color-coded badges: green (>30d), yellow (<=30d),
 * red (<=7d) to indicate urgency.
 *
 * @param props - WarrantyAlertsBannerProps
 * @returns A warranty alerts banner component
 */
export function WarrantyAlertsBanner({
  daysAhead = 90,
}: WarrantyAlertsBannerProps) {
  const t = useTranslations("assets");

  const { data: alerts, isLoading } = trpc.asset.getWarrantyAlerts.useQuery({
    daysAhead,
  });

  if (isLoading || !alerts || alerts.length === 0) {
    return null;
  }

  // Group by urgency
  const critical = alerts.filter((a) => a.daysRemaining <= 7);
  const warning = alerts.filter(
    (a) => a.daysRemaining > 7 && a.daysRemaining <= 30,
  );
  const upcoming = alerts.filter((a) => a.daysRemaining > 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4" aria-hidden="true" />
          {t("warranty_alerts")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {critical.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="size-4 text-destructive"
                aria-hidden="true"
              />
              <Badge variant="destructive">
                {critical.length} {t("warranty_critical")}
              </Badge>
            </div>
          )}
          {warning.length > 0 && (
            <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400">
              {warning.length} {t("warranty_warning")}
            </Badge>
          )}
          {upcoming.length > 0 && (
            <Badge variant="secondary">
              {upcoming.length} {t("warranty_upcoming")}
            </Badge>
          )}
        </div>

        {/* Individual alerts list */}
        <ul className="mt-3 space-y-2" role="list">
          {alerts.slice(0, 5).map((alert) => (
            <li
              key={alert.assetId}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {alert.assetName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {alert.assetTag}
                  {alert.warrantyProvider && ` - ${alert.warrantyProvider}`}
                </span>
              </div>
              <Badge
                variant={
                  alert.daysRemaining <= 7
                    ? "destructive"
                    : alert.daysRemaining <= 30
                      ? "secondary"
                      : "default"
                }
              >
                {alert.daysRemaining} {t("days")}
              </Badge>
            </li>
          ))}
        </ul>

        {alerts.length > 5 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("warranty_and_more", { count: alerts.length - 5 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

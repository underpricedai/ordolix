"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileKey,
  Calendar,
  DollarSign,
  Shield,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { LicenseAllocationPanel } from "./LicenseAllocationPanel";

interface LicenseDetailProps {
  licenseId: string;
  onBack?: () => void;
  onEdit?: (id: string) => void;
}

/**
 * LicenseDetail renders the full detail view for a single software license.
 *
 * @description Displays license info, compliance gauge, allocations list,
 * and renewal information.
 *
 * @param props - LicenseDetailProps
 * @returns The license detail view component
 */
export function LicenseDetail({ licenseId, onBack, onEdit }: LicenseDetailProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const { data: licenseData, isLoading, error } = trpc.asset.getLicense.useQuery(
    { id: licenseId },
    { enabled: Boolean(licenseId) },
  );

  const { data: compliance } = trpc.asset.getLicenseCompliance.useQuery(
    { licenseId },
    { enabled: Boolean(licenseId) },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const license = licenseData as any;

  if (isLoading) {
    return <LicenseDetailSkeleton />;
  }

  if (error || !license) {
    return (
      <EmptyState
        icon={<FileKey className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  const complianceStatusColor = !compliance
    ? "text-muted-foreground"
    : compliance.status === "compliant"
      ? "text-green-600 dark:text-green-400"
      : compliance.status === "over_deployed"
        ? "text-red-600 dark:text-red-400"
        : "text-yellow-600 dark:text-yellow-400";

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={tc("back")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileKey className="size-6 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-foreground">
              {license.name}
            </h2>
            <Badge
              variant={license.status === "active" ? "default" : license.status === "expired" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {t(`license_status_${license.status}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {license.vendor && (
              <span className="text-sm text-muted-foreground">
                {license.vendor}
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {t(`license_type_${license.licenseType}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
        </div>
        {onEdit && (
          <Button variant="outline" onClick={() => onEdit(licenseId)}>
            {tc("edit")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* License properties */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("license_details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("name")}</dt>
                <dd className="mt-1 text-sm text-foreground">{license.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("license_vendor")}</dt>
                <dd className="mt-1 text-sm text-foreground">{license.vendor ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("license_type")}</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {t(`license_type_${license.licenseType}` as Parameters<typeof t>[0])}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("entitlements_total")}</dt>
                <dd className="mt-1 text-sm font-mono text-foreground">{license.totalEntitlements}</dd>
              </div>
              {license.purchasePrice && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{t("license_purchase_price")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {new Intl.NumberFormat("en", {
                      style: "currency",
                      currency: license.currency ?? "USD",
                    }).format(Number(license.purchasePrice))}
                  </dd>
                </div>
              )}
              {license.licenseKey && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{t("license_key")}</dt>
                  <dd className="mt-1 text-sm font-mono text-foreground truncate">{license.licenseKey}</dd>
                </div>
              )}
              {license.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">{t("notes")}</dt>
                  <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">{license.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Sidebar: Compliance + Renewal */}
        <div className="space-y-6">
          {/* Compliance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4" aria-hidden="true" />
                {t("compliance_status")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compliance ? (
                <div className="space-y-3">
                  <div className={`text-lg font-semibold ${complianceStatusColor}`}>
                    {t(`compliance_${compliance.status}` as Parameters<typeof t>[0])}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{compliance.used}</div>
                      <div className="text-xs text-muted-foreground">{t("entitlements_used")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{compliance.total}</div>
                      <div className="text-xs text-muted-foreground">{t("entitlements_total")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{compliance.available}</div>
                      <div className="text-xs text-muted-foreground">{t("entitlements_available")}</div>
                    </div>
                  </div>
                  {/* Simple bar gauge */}
                  <div className="h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={compliance.used} aria-valuemin={0} aria-valuemax={compliance.total}>
                    <div
                      className={`h-full rounded-full ${
                        compliance.status === "over_deployed"
                          ? "bg-red-500"
                          : compliance.status === "under_utilized"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, (compliance.used / compliance.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </CardContent>
          </Card>

          {/* Renewal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="size-4" aria-hidden="true" />
                {t("renewal_info")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{t("renewal_date")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {license.renewalDate
                      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(license.renewalDate))
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{t("expiration_date")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {license.expirationDate
                      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(license.expirationDate))
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{t("license_auto_renew")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {license.autoRenew ? tc("yes") : tc("no")}
                  </dd>
                </div>
                {license.renewalCost && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">{t("renewal_cost")}</dt>
                    <dd className="mt-1 flex items-center gap-1 text-sm text-foreground">
                      <DollarSign className="size-3 text-muted-foreground" aria-hidden="true" />
                      {new Intl.NumberFormat("en", {
                        style: "currency",
                        currency: license.currency ?? "USD",
                      }).format(Number(license.renewalCost))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Allocations panel */}
      <LicenseAllocationPanel licenseId={licenseId} />
    </div>
  );
}

function LicenseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-8" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

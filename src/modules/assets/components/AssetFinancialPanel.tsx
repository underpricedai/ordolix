"use client";

import { useTranslations } from "next-intl";
import { DollarSign, Shield, TrendingDown, Calculator } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { trpc } from "@/shared/lib/trpc";

interface AssetFinancialPanelProps {
  assetId: string;
}

/**
 * AssetFinancialPanel displays the financial details for a single asset.
 *
 * @description Shows purchase info, depreciation schedule, warranty status,
 * and total cost of ownership breakdown. All monetary values are formatted
 * with Intl.NumberFormat.
 *
 * @param props - AssetFinancialPanelProps
 * @returns The asset financial panel component
 */
export function AssetFinancialPanel({ assetId }: AssetFinancialPanelProps) {

  const t = useTranslations("assets");

  const { data: financials, isLoading: financialsLoading } =
    trpc.asset.getAssetFinancials.useQuery(
      { assetId },
      { enabled: Boolean(assetId) },
    );

  const { data: tcoData } = trpc.asset.getAssetTCO.useQuery(
    { assetId },
    { enabled: Boolean(assetId) && Boolean(financials) },
  );

  // Calculate depreciation if we have the necessary fields
  const depInput =
    financials?.purchasePrice &&
    financials?.usefulLifeMonths &&
    financials?.purchaseDate &&
    financials?.depreciationMethod
      ? {
          purchasePrice: financials.purchasePrice,
          salvageValue: financials.salvageValue ?? 0,
          usefulLifeMonths: financials.usefulLifeMonths,
          depreciationMethod: financials.depreciationMethod as
            | "straight_line"
            | "declining_balance",
          purchaseDate: new Date(financials.purchaseDate),
        }
      : null;

  const { data: depreciation } = trpc.asset.calculateDepreciation.useQuery(
    depInput!,
    { enabled: Boolean(depInput) },
  );

  if (financialsLoading) {
    return <FinancialPanelSkeleton />;
  }

  if (!financials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4" aria-hidden="true" />
            {t("financial_details")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("financial_no_data")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: financials.purchaseCurrency ?? "USD",
    }).format(value);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(date),
    );
  };

  const warrantyDaysRemaining = financials.warrantyEnd
    ? Math.ceil(
        (new Date(financials.warrantyEnd).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  const warrantyBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (warrantyDaysRemaining === null) return "outline";
    if (warrantyDaysRemaining <= 0) return "destructive";
    if (warrantyDaysRemaining <= 7) return "destructive";
    if (warrantyDaysRemaining <= 30) return "secondary";
    return "default";
  };

  return (
    <div className="space-y-4">
      {/* Purchase Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4" aria-hidden="true" />
            {t("financial_purchase_info")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                {t("purchase_price")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatCurrency(financials.purchasePrice)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                {t("purchase_date")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(financials.purchaseDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                {t("cost_center")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {financials.costCenter ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                {t("cost_type")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {financials.costType
                  ? t(`cost_type_${financials.costType}` as Parameters<typeof t>[0])
                  : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Depreciation Schedule */}
      {depreciation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4" aria-hidden="true" />
              {t("depreciation_schedule")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("depreciation_method")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {t(
                    `depreciation_${financials.depreciationMethod}` as Parameters<typeof t>[0],
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("book_value")}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(depreciation.currentBookValue)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("salvage_value")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(financials.salvageValue)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("percent_depreciated")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {depreciation.percentDepreciated}%
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("useful_life")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {financials.usefulLifeMonths} {t("months")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("monthly_depreciation")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(depreciation.monthlyDepreciation)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Warranty Status */}
      {(financials.warrantyStart || financials.warrantyEnd) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" aria-hidden="true" />
              {t("warranty_status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("warranty_provider")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {financials.warrantyProvider ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("warranty_start")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(financials.warrantyStart)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("warranty_end")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(financials.warrantyEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("warranty_days_remaining")}
                </dt>
                <dd className="mt-1">
                  {warrantyDaysRemaining !== null ? (
                    <Badge variant={warrantyBadgeVariant()}>
                      {warrantyDaysRemaining > 0
                        ? `${warrantyDaysRemaining} ${t("days")}`
                        : t("warranty_expired")}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
            </dl>
            {financials.warrantyNotes && (
              <div className="mt-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("warranty_notes")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {financials.warrantyNotes}
                </dd>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TCO Breakdown */}
      {tcoData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="size-4" aria-hidden="true" />
              {t("tco_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("purchase_price")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(tcoData.purchasePrice)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("maintenance_cost")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(tcoData.maintenanceCost)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("disposal_value")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(tcoData.disposalValue)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("tco_total")}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(tcoData.totalCostOfOwnership)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinancialPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1 h-4 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

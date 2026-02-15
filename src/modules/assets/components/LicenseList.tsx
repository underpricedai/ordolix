"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileKey, Inbox, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { LICENSE_STATUSES } from "../types/schemas";

interface LicenseRow {
  id: string;
  name: string;
  vendor: string | null;
  licenseType: string;
  totalEntitlements: number;
  status: string;
  _count: { allocations: number };
}

/**
 * Returns compliance badge based on usage ratio.
 */
function ComplianceBadge({
  used,
  total,
  t,
}: {
  used: number;
  total: number;
  t: (key: string) => string;
}) {
  if (used > total) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t("compliance_over_deployed")}
      </Badge>
    );
  }
  if (used < total * 0.5) {
    return (
      <Badge variant="secondary" className="text-xs">
        {t("compliance_under_utilized")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 text-xs">
      {t("compliance_compliant")}
    </Badge>
  );
}

function LicenseStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const variant = status === "active" ? "default" : status === "expired" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="text-xs">
      {t(`license_status_${status}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

function licenseColumns(
  t: (key: string) => string,
): ResponsiveColumnDef<LicenseRow>[] {
  return [
    {
      key: "name",
      header: t("name"),
      priority: 1,
      cell: (license) => (
        <div className="flex items-center gap-2">
          <FileKey className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{license.name}</span>
        </div>
      ),
    },
    {
      key: "vendor",
      header: t("license_vendor"),
      priority: 2,
      className: "w-[140px]",
      cell: (license) => (
        <span className="text-sm text-muted-foreground">
          {license.vendor ?? "-"}
        </span>
      ),
    },
    {
      key: "type",
      header: t("license_type"),
      priority: 3,
      className: "w-[120px]",
      cell: (license) => (
        <Badge variant="outline" className="text-xs">
          {t(`license_type_${license.licenseType}` as Parameters<typeof t>[0])}
        </Badge>
      ),
    },
    {
      key: "entitlements",
      header: t("entitlements_usage"),
      priority: 2,
      className: "w-[140px]",
      cell: (license) => (
        <span className="text-sm font-mono">
          {license._count.allocations}/{license.totalEntitlements}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status"),
      priority: 2,
      className: "w-[110px]",
      cell: (license) => <LicenseStatusBadge status={license.status} t={t} />,
    },
    {
      key: "compliance",
      header: t("compliance_status"),
      priority: 2,
      className: "w-[130px]",
      cell: (license) => (
        <ComplianceBadge
          used={license._count.allocations}
          total={license.totalEntitlements}
          t={t}
        />
      ),
    },
  ];
}

interface LicenseListProps {
  onSelectLicense?: (id: string) => void;
  onCreateLicense?: () => void;
}

/**
 * LicenseList renders the software license inventory table with search,
 * status filter, and compliance badges.
 *
 * @param props - LicenseListProps
 * @returns A license inventory table component
 */
export function LicenseList({ onSelectLicense, onCreateLicense }: LicenseListProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const {
    data: licensesData,
    isLoading,
    error,
  } = trpc.asset.listLicenses.useQuery(
    {
      status: filterStatus !== "all" ? (filterStatus as typeof LICENSE_STATUSES[number]) : undefined,
      search: searchQuery || undefined,
    },
    { enabled: true },
  );

  const licenses: LicenseRow[] = (licensesData ?? []) as unknown as LicenseRow[];

  if (isLoading) {
    return <LicenseListSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Inbox className="size-12" />}
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

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("license_search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("license_search")}
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {LICENSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`license_status_${s}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Licenses table */}
      {licenses.length === 0 ? (
        <EmptyState
          icon={<FileKey className="size-12" />}
          title={t("license_empty_title")}
          description={t("license_empty_description")}
          action={
            onCreateLicense ? (
              <Button onClick={onCreateLicense}>{t("license_create")}</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable<LicenseRow>
            columns={licenseColumns(t)}
            data={licenses}
            rowKey={(row) => row.id}
            onRowClick={(row) => onSelectLicense?.(row.id)}
            mobileCard={(license) => (
              <Card
                className="p-3"
                onClick={() => onSelectLicense?.(license.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileKey className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium">{license.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {license.vendor ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <LicenseStatusBadge status={license.status} t={t} />
                      <ComplianceBadge
                        used={license._count.allocations}
                        total={license.totalEntitlements}
                        t={t}
                      />
                      <span className="text-xs font-mono text-muted-foreground">
                        {license._count.allocations}/{license.totalEntitlements}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          />
        </div>
      )}
    </div>
  );
}

function LicenseListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[150px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

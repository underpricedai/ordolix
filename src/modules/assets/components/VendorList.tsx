"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Inbox, Search } from "lucide-react";
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

interface VendorRow {
  id: string;
  name: string;
  contactEmail: string | null;
  website: string | null;
  isActive: boolean;
  _count: { contracts: number };
}

function VendorStatusBadge({ isActive, t }: { isActive: boolean; t: (key: string) => string }) {
  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className="text-xs"
    >
      {isActive ? t("vendor_active") : t("vendor_inactive")}
    </Badge>
  );
}

function vendorColumns(
  t: (key: string) => string,
): ResponsiveColumnDef<VendorRow>[] {
  return [
    {
      key: "name",
      header: t("name"),
      priority: 1,
      cell: (vendor) => (
        <div className="flex items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{vendor.name}</span>
        </div>
      ),
    },
    {
      key: "contactEmail",
      header: t("vendor_contact_email"),
      priority: 2,
      className: "w-[200px]",
      cell: (vendor) => (
        <span className="text-sm text-muted-foreground">
          {vendor.contactEmail ?? "-"}
        </span>
      ),
    },
    {
      key: "website",
      header: t("vendor_website"),
      priority: 3,
      className: "w-[180px]",
      cell: (vendor) => (
        <span className="text-sm text-muted-foreground truncate">
          {vendor.website ?? "-"}
        </span>
      ),
    },
    {
      key: "contracts",
      header: t("vendor_contracts"),
      priority: 2,
      className: "w-[100px]",
      cell: (vendor) => (
        <span className="text-sm font-mono">
          {vendor._count.contracts}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status"),
      priority: 2,
      className: "w-[100px]",
      cell: (vendor) => <VendorStatusBadge isActive={vendor.isActive} t={t} />,
    },
  ];
}

interface VendorListProps {
  onSelectVendor?: (id: string) => void;
  onCreateVendor?: () => void;
}

/**
 * VendorList renders the vendor management table with search
 * and active status filter.
 *
 * @param props - VendorListProps
 * @returns A vendor inventory table component
 */
export function VendorList({ onSelectVendor, onCreateVendor }: VendorListProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  const {
    data: vendorsData,
    isLoading,
    error,
  } = trpc.vendor.listVendors.useQuery(
    {
      isActive: filterActive === "all" ? undefined : filterActive === "active",
      search: searchQuery || undefined,
    },
    { enabled: true },
  );

  const vendors: VendorRow[] = (vendorsData ?? []) as unknown as VendorRow[];

  if (isLoading) {
    return <VendorListSkeleton />;
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
            placeholder={t("vendor_search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("vendor_search")}
          />
        </div>

        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[150px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="active">{t("vendor_active")}</SelectItem>
            <SelectItem value="inactive">{t("vendor_inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors table */}
      {vendors.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-12" />}
          title={t("vendor_empty_title")}
          description={t("vendor_empty_description")}
          action={
            onCreateVendor ? (
              <Button onClick={onCreateVendor}>{t("vendor_create")}</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable<VendorRow>
            columns={vendorColumns(t)}
            data={vendors}
            rowKey={(row) => row.id}
            onRowClick={(row) => onSelectVendor?.(row.id)}
            mobileCard={(vendor) => (
              <Card
                className="p-3"
                onClick={() => onSelectVendor?.(vendor.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium">{vendor.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {vendor.contactEmail ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <VendorStatusBadge isActive={vendor.isActive} t={t} />
                      <span className="text-xs text-muted-foreground">
                        {vendor._count.contracts} {t("vendor_contracts").toLowerCase()}
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

function VendorListSkeleton() {
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
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead><Skeleton className="h-4 w-28" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
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
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

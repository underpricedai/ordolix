"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Inbox, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
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
import { cn } from "@/shared/lib/utils";

/**
 * Asset row data shape from the API.
 */
interface AssetRow {
  id: string;
  name: string;
  assetType: { id: string; name: string; icon?: string };
  status: string;
  owner?: { name: string; image?: string } | null;
  location?: string;
  updatedAt: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  retired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

/**
 * Builds responsive column definitions for the asset table.
 */
function assetColumns(
  t: (key: string) => string,
): ResponsiveColumnDef<AssetRow>[] {
  return [
    {
      key: "name",
      header: t("name"),
      priority: 1,
      cell: (asset) => (
        <div className="flex items-center gap-2">
          <Box className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{asset.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: t("type"),
      priority: 2,
      className: "w-[140px]",
      cell: (asset) => (
        <Badge variant="secondary" className="text-xs">
          {asset.assetType.icon && (
            <span className="mr-1">{asset.assetType.icon}</span>
          )}
          {asset.assetType.name}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("status"),
      priority: 2,
      className: "w-[120px]",
      cell: (asset) => (
        <Badge
          variant="outline"
          className={cn(
            "text-xs border-transparent",
            statusStyles[asset.status] ?? statusStyles.active,
          )}
        >
          {asset.status}
        </Badge>
      ),
    },
    {
      key: "owner",
      header: t("owner"),
      priority: 3,
      className: "w-[180px]",
      cell: (asset) =>
        asset.owner ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {(asset.owner.name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{asset.owner.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: "created",
      header: t("lastUpdated"),
      priority: 5,
      className: "w-[140px]",
      cell: (asset) => (
        <span className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
            new Date(asset.updatedAt),
          )}
        </span>
      ),
    },
  ];
}

interface AssetListProps {
  /** Callback when an asset row is clicked */
  onSelectAsset?: (id: string) => void;
}

/**
 * AssetList renders the asset inventory table with search, filter, and
 * sortable columns.
 *
 * @description Displays all assets in a table with name, type, status, owner,
 * location, and last updated columns. Supports filtering by type and status,
 * and full-text search across asset names.
 *
 * @param props - AssetListProps
 * @returns An asset inventory table component
 *
 * @example
 * <AssetList onSelectAsset={(id) => setSelectedAssetId(id)} />
 */
export function AssetList({ onSelectAsset }: AssetListProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // tRPC query for assets
  const {
    data: assetsData,
    isLoading,
    error,
  } = trpc.asset.listAssets.useQuery(
    {
      assetTypeId: filterType !== "all" ? filterType : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
    },
    { enabled: true },
  );

  const assets: AssetRow[] = (assetsData as { items?: AssetRow[] })?.items ?? [];

  // Client-side search filter
  const filteredAssets = searchQuery
    ? assets.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : assets;

  if (isLoading) {
    return <AssetListSkeleton />;
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
            placeholder={t("searchAssets")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchAssets")}
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]" aria-label={t("filterType")}>
            <SelectValue placeholder={t("assetTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="server">{t("typeServer")}</SelectItem>
            <SelectItem value="laptop">{t("typeLaptop")}</SelectItem>
            <SelectItem value="software">{t("typeSoftware")}</SelectItem>
            <SelectItem value="network">{t("typeNetwork")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="active">{t("statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
            <SelectItem value="maintenance">{t("statusMaintenance")}</SelectItem>
            <SelectItem value="retired">{t("statusRetired")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assets table */}
      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={<Box className="size-12" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable<AssetRow>
            columns={assetColumns(t)}
            data={filteredAssets}
            rowKey={(row) => row.id}
            onRowClick={(row) => onSelectAsset?.(row.id)}
            mobileCard={(asset) => (
              <Card
                className="p-3"
                onClick={() => onSelectAsset?.(asset.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Box className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium">{asset.name}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {asset.assetType.icon && (
                          <span className="mr-1">{asset.assetType.icon}</span>
                        )}
                        {asset.assetType.name}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-transparent",
                          statusStyles[asset.status] ?? statusStyles.active,
                        )}
                      >
                        {asset.status}
                      </Badge>
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

/**
 * Skeleton loading state for AssetList.
 */
function AssetListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-10" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
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
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

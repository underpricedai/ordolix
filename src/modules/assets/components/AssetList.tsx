"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Download, Inbox, Search, Tag, Upload } from "lucide-react";
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
import { AssetStatusBadge } from "./AssetStatusBadge";
import { ExportDialog } from "./ExportDialog";
import { ASSET_STATUSES } from "../types/schemas";

interface AssetRow {
  id: string;
  assetTag: string;
  name: string;
  assetType: { id: string; name: string; icon?: string };
  status: string;
  assignee?: { name: string; image?: string } | null;
  updatedAt: string;
}

function assetColumns(
  t: (key: string) => string,
): ResponsiveColumnDef<AssetRow>[] {
  return [
    {
      key: "assetTag",
      header: t("assetTag"),
      priority: 2,
      className: "w-[120px]",
      cell: (asset) => (
        <span className="text-sm font-mono text-muted-foreground">{asset.assetTag}</span>
      ),
    },
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
      className: "w-[130px]",
      cell: (asset) => <AssetStatusBadge status={asset.status} />,
    },
    {
      key: "assignee",
      header: t("assignee"),
      priority: 3,
      className: "w-[180px]",
      cell: (asset) =>
        asset.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {(asset.assignee.name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{asset.assignee.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: "updated",
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
  onSelectAsset?: (id: string) => void;
  /** Called when the user clicks the Import button */
  onImport?: () => void;
}

/**
 * AssetList renders the asset inventory table with search, dynamic filters
 * from the database, and sortable columns.
 *
 * @param props - AssetListProps
 * @returns An asset inventory table component
 */
export function AssetList({ onSelectAsset, onImport }: AssetListProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: assetTypes } = trpc.asset.listAssetTypes.useQuery();

  const {
    data: assetsData,
    isLoading,
    error,
  } = trpc.asset.listAssets.useQuery(
    {
      assetTypeId: filterType !== "all" ? filterType : undefined,
      status: filterStatus !== "all" ? (filterStatus as typeof ASSET_STATUSES[number]) : undefined,
    },
    { enabled: true },
  );

  const assets: AssetRow[] = (assetsData ?? []) as unknown as AssetRow[];

  const filteredAssets = searchQuery
    ? assets.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assetTag.toLowerCase().includes(searchQuery.toLowerCase()),
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
            {(assetTypes ?? []).map((at) => (
              <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status_${s}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {onImport && (
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="mr-2 size-4" aria-hidden="true" />
              {tc("import")}
            </Button>
          )}
          <ExportDialog />
        </div>
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
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="size-3" aria-hidden="true" />
                      {asset.assetTag}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {asset.assetType.name}
                      </Badge>
                      <AssetStatusBadge status={asset.status} />
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

function AssetListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[150px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-10" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20 font-mono" /></TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

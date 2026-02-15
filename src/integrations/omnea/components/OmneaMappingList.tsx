/**
 * Omnea mapping list component.
 *
 * @description Displays a table of Omnea-to-Ordolix mappings with
 * sync status indicators, filtering, and delete actions.
 *
 * @module integrations/omnea/components/OmneaMappingList
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { trpc } from "@/shared/lib/trpc";

/** Maps mapping status to visual properties */
const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; className: string }
> = {
  synced: {
    icon: CheckCircle2,
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  pending: {
    icon: Clock,
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  error: {
    icon: AlertTriangle,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  deleted: {
    icon: XCircle,
    className:
      "border-muted bg-muted/30 text-muted-foreground",
  },
};

/**
 * Displays the list of Omnea mappings with filters.
 *
 * Features:
 * - Search by Omnea request ID
 * - Filter by sync status
 * - Delete individual mappings
 * - Shows last sync timestamp
 */
export function OmneaMappingList() {
  const t = useTranslations("integrations.omnea");
  const tc = useTranslations("common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, refetch, isLoading } = trpc.omnea.listMappings.useQuery({
    search: search || undefined,
    status: statusFilter as "pending" | "synced" | "error" | "deleted" | undefined,
    limit: 50,
  });

  const deleteMutation = trpc.omnea.deleteMapping.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id });
    },
    [deleteMutation],
  );

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("mappingsTitle")}</CardTitle>
        <CardDescription>{t("mappingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
              aria-label={tc("search")}
            />
          </div>
          <Select
            value={statusFilter ?? "all"}
            onValueChange={(val) =>
              setStatusFilter(val === "all" ? undefined : val)
            }
          >
            <SelectTrigger className="w-full sm:w-40" aria-label={t("filterByStatus")}>
              <SelectValue placeholder={tc("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              <SelectItem value="pending">{t("statusPending")}</SelectItem>
              <SelectItem value="synced">{t("statusSynced")}</SelectItem>
              <SelectItem value="error">{t("statusError")}</SelectItem>
              <SelectItem value="deleted">{t("statusDeleted")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {tc("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("noMappings")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b text-start text-muted-foreground">
                  <th className="pb-2 pe-4 font-medium">
                    <span className="inline-flex items-center gap-1">
                      {t("omneaRequestId")}
                      <ArrowUpDown className="size-3" aria-hidden="true" />
                    </span>
                  </th>
                  <th className="pb-2 pe-4 font-medium">{t("procurementRequestId")}</th>
                  <th className="pb-2 pe-4 font-medium">{t("licenseId")}</th>
                  <th className="pb-2 pe-4 font-medium">{tc("status")}</th>
                  <th className="pb-2 pe-4 font-medium">{t("lastSynced")}</th>
                  <th className="pb-2 font-medium">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((mapping) => {
                  const statusKey = mapping.status as keyof typeof STATUS_CONFIG;
                  const statusInfo = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo!.icon;
                  return (
                    <tr
                      key={mapping.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 pe-4 font-mono text-xs">
                        {mapping.omneaRequestId}
                      </td>
                      <td className="py-3 pe-4 font-mono text-xs text-muted-foreground">
                        {mapping.procurementRequestId ?? "-"}
                      </td>
                      <td className="py-3 pe-4 font-mono text-xs text-muted-foreground">
                        {mapping.licenseId ?? "-"}
                      </td>
                      <td className="py-3 pe-4">
                        <Badge
                          variant="outline"
                          className={statusInfo!.className}
                        >
                          <StatusIcon className="me-1 size-3" aria-hidden="true" />
                          {t(`status${mapping.status.charAt(0).toUpperCase()}${mapping.status.slice(1)}`)}
                        </Badge>
                      </td>
                      <td className="py-3 pe-4 text-xs text-muted-foreground">
                        {mapping.lastSyncAt
                          ? new Intl.DateTimeFormat(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(String(mapping.lastSyncAt)))
                          : "-"}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(mapping.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={t("deleteMapping")}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with total count */}
        {data && data.total > 0 && (
          <div className="text-xs text-muted-foreground">
            {t("totalMappings", { count: data.total })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

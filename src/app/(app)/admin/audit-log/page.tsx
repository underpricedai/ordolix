/**
 * Admin audit log page.
 *
 * @description Displays a filterable, paginated table of audit log entries
 * showing who did what, when, and on which resource. Supports filtering
 * by date range, user, and action type.
 *
 * @module admin-audit-log
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Inbox,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";

/**
 * Action types available for filtering audit log entries.
 */
const ACTION_TYPES = [
  "all",
  "create",
  "update",
  "delete",
  "transition",
  "login",
  "logout",
  "permission_change",
  "config_change",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditLogEntry = any;

export default function AdminAuditLogPage() {
  const t = useTranslations("admin.auditLog");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // TODO: Replace with tRPC admin.listAuditLogs query once admin router is implemented
  const isLoading = false;

  const entries: AuditLogEntry[] = [];
  const currentPage = 1;
  const totalPages = 1;

  /**
   * Returns a color class for the action badge based on the action type.
   */
  function getActionBadgeClass(action: string): string {
    switch (action) {
      case "create":
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "update":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "delete":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "transition":
        return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search by user or resource */}
        <div className="relative max-w-xs flex-1">
          <Label htmlFor="audit-search" className="sr-only">
            {t("searchPlaceholder")}
          </Label>
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="audit-search"
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        {/* Action type filter */}
        <div className="grid gap-1.5">
          <Label htmlFor="action-filter">{t("actionType")}</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger id="action-filter" className="w-[180px]">
              <SelectValue placeholder={t("allActions")} />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action} value={action}>
                  {t(`actions.${action}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range filters */}
        <div className="grid gap-1.5">
          <Label htmlFor="date-from">{t("dateFrom")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-from"
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 size-4" aria-hidden="true" />
                {dateFrom || t("selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label={t("dateFrom")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="date-to">{t("dateTo")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-to"
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 size-4" aria-hidden="true" />
                {dateTo || t("selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label={t("dateTo")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Audit log table */}
      {isLoading ? (
        <AuditLogSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noEntries")}
          description={t("noEntriesDescription")}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">{t("timestamp")}</TableHead>
                  <TableHead className="w-[160px]">{t("user")}</TableHead>
                  <TableHead className="w-[120px]">{t("action")}</TableHead>
                  <TableHead>{t("resource")}</TableHead>
                  <TableHead>{tc("details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: AuditLogEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.timestamp
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(entry.timestamp))
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.userName ?? entry.userId ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getActionBadgeClass(entry.action)}`}
                      >
                        {t(`actions.${entry.action}` as "actions.create")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{entry.resourceType}</span>
                      {entry.resourceId && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({entry.resourceId})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {entry.details ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("pageInfo", { current: currentPage, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={currentPage <= 1}
                aria-label={t("previousPage")}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={currentPage >= totalPages}
                aria-label={t("nextPage")}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the audit log table.
 */
function AuditLogSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[160px]"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

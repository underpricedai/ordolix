"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Clock,
  Inbox,
  Search,
} from "lucide-react";
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
import { cn } from "@/shared/lib/utils";

/**
 * Incident row data from the API.
 */
interface IncidentRow {
  id: string;
  key: string;
  title: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: string;
  assignee?: { name: string } | null;
  createdAt: string;
  resolvedAt?: string | null;
}

const severityConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  P1: {
    label: "Critical",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  P2: {
    label: "Major",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  P3: {
    label: "Minor",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  P4: {
    label: "Cosmetic",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  investigating: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  mitigated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

/**
 * Builds responsive column definitions for the incident table.
 */
function incidentColumns(
  t: (key: string) => string,
  timeToResolve: (createdAt: string, resolvedAt?: string | null) => string,
): ResponsiveColumnDef<IncidentRow>[] {
  return [
    {
      key: "title",
      header: t("titleColumn"),
      priority: 1,
      cell: (inc) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{inc.key}</span>
          <span className="max-w-[300px] truncate">{inc.title}</span>
        </div>
      ),
    },
    {
      key: "severity",
      header: t("severity"),
      priority: 1,
      className: "w-[110px]",
      cell: (inc) => {
        const sevConfig = severityConfig[inc.severity];
        return (
          <Badge
            variant="outline"
            className={cn("border-transparent text-xs font-semibold", sevConfig?.bgColor)}
          >
            <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
            {inc.severity}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: t("status"),
      priority: 2,
      className: "w-[120px]",
      cell: (inc) => (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent text-xs",
            statusColors[inc.status] ?? statusColors.open,
          )}
        >
          {inc.status}
        </Badge>
      ),
    },
    {
      key: "assignee",
      header: t("assignee"),
      priority: 3,
      className: "w-[150px]",
      cell: (inc) => (
        <span className="text-sm">
          {inc.assignee?.name ?? <span className="text-muted-foreground">-</span>}
        </span>
      ),
    },
    {
      key: "created",
      header: t("created"),
      priority: 5,
      className: "w-[130px]",
      cell: (inc) => (
        <span className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
            new Date(inc.createdAt),
          )}
        </span>
      ),
    },
    {
      key: "timeToResolve",
      header: t("timeToResolve"),
      priority: 5,
      className: "w-[120px]",
      cell: (inc) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {timeToResolve(inc.createdAt, inc.resolvedAt)}
        </div>
      ),
    },
  ];
}

interface IncidentListProps {
  /** Callback when an incident row is selected */
  onSelectIncident?: (id: string) => void;
}

/**
 * IncidentList renders the incident tracker table.
 *
 * @description Displays incidents in a table with ID, title, severity, status,
 * assignee, created date, and time-to-resolve columns. Severity is color-coded
 * (P1=red, P2=orange, P3=yellow, P4=blue). Quick filters for severity and status.
 *
 * @param props - IncidentListProps
 * @returns An incident tracker table component
 *
 * @example
 * <IncidentList onSelectIncident={(id) => setSelectedId(id)} />
 */
export function IncidentList({ onSelectIncident }: IncidentListProps) {
  const t = useTranslations("incidents");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // tRPC query for incidents
  const {
    data: incidentsData,
    isLoading,
    error,
  } = trpc.incident.list.useQuery(
    {
      severity: filterSeverity !== "all" ? (filterSeverity as "P1" | "P2" | "P3" | "P4") : undefined,
      resolved: filterStatus === "resolved" ? true : filterStatus === "open" ? false : undefined,
    },
    { enabled: true },
  );

  const incidents: IncidentRow[] =
    (incidentsData as { items?: IncidentRow[] })?.items ?? [];

  // Client-side search filter
  const filteredIncidents = searchQuery
    ? incidents.filter(
        (inc) =>
          inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.key.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : incidents;

  /**
   * Calculates time to resolve as a human-readable string.
   */
  function timeToResolve(createdAt: string, resolvedAt?: string | null): string {
    if (!resolvedAt) return "-";
    const created = new Date(createdAt).getTime();
    const resolved = new Date(resolvedAt).getTime();
    const diffMs = resolved - created;
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  if (isLoading) {
    return <IncidentListSkeleton />;
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
      {/* Search and quick filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchIncidents")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchIncidents")}
          />
        </div>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[130px]" aria-label={t("filterSeverity")}>
            <SelectValue placeholder={t("severity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="P1">{t("severityP1")}</SelectItem>
            <SelectItem value="P2">{t("severityP2")}</SelectItem>
            <SelectItem value="P3">{t("severityP3")}</SelectItem>
            <SelectItem value="P4">{t("severityP4")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="open">{t("statusOpen")}</SelectItem>
            <SelectItem value="investigating">{t("statusInvestigating")}</SelectItem>
            <SelectItem value="mitigated">{t("statusMitigated")}</SelectItem>
            <SelectItem value="resolved">{t("statusResolved")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incidents table */}
      {filteredIncidents.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="size-12" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable<IncidentRow>
            columns={incidentColumns(t, timeToResolve)}
            data={filteredIncidents}
            rowKey={(row) => row.id}
            onRowClick={(row) => onSelectIncident?.(row.id)}
            mobileCard={(incident) => {
              const sevConfig = severityConfig[incident.severity];
              return (
                <Card
                  className="p-3"
                  onClick={() => onSelectIncident?.(incident.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{incident.key}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{incident.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent text-xs font-semibold",
                          sevConfig?.bgColor,
                        )}
                      >
                        <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
                        {incident.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent text-xs",
                          statusColors[incident.status] ?? statusColors.open,
                        )}
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for IncidentList.
 */
function IncidentListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[130px]" />
        <Skeleton className="h-9 w-[130px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-8" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

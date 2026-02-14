"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

/** SLA instance status type */
type SLAStatus = "active" | "paused" | "met" | "breached";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SLAInstance = any;

/**
 * Returns a color class based on the SLA status and percentage remaining.
 */
function getStatusColor(status: SLAStatus, percentRemaining: number): string {
  if (status === "breached") return "text-destructive";
  if (status === "met") return "text-green-600 dark:text-green-400";
  if (percentRemaining <= 20) return "text-destructive";
  if (percentRemaining <= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

/**
 * Returns the progress bar color class based on status.
 */
function getProgressClass(status: SLAStatus, percentRemaining: number): string {
  if (status === "breached") return "[&>[data-slot=progress-indicator]]:bg-destructive";
  if (status === "met") return "[&>[data-slot=progress-indicator]]:bg-green-600";
  if (percentRemaining <= 20) return "[&>[data-slot=progress-indicator]]:bg-destructive";
  if (percentRemaining <= 50) return "[&>[data-slot=progress-indicator]]:bg-yellow-500";
  return "[&>[data-slot=progress-indicator]]:bg-green-600";
}

/**
 * Formats remaining time in minutes to a human-readable string.
 */
function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "Breached";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 24) {
    const d = Math.floor(h / 24);
    const remainH = h % 24;
    return `${d}d ${remainH}h`;
  }
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * SLADashboard renders an overview of SLA health across all active instances.
 *
 * @description Shows summary cards for active, breached, and at-risk SLAs.
 * Below the cards is a table of all SLA instances with time remaining
 * progress bars. Color coding: green (on track), yellow (warning), red (breached).
 *
 * @returns SLA dashboard component
 */
export function SLADashboard() {
  const t = useTranslations("sla");
  const tc = useTranslations("common");

  const {
    data: instancesData,
    isLoading,
    error,
  } = trpc.sla.getInstances.useQuery(
    { issueId: "" },
    { enabled: true },
  );

  const instances: SLAInstance[] = useMemo(
    () => (instancesData ?? []) as SLAInstance[],
    [instancesData],
  );

  // Compute summary stats
  const stats = useMemo(() => {
    let active = 0;
    let breached = 0;
    let atRisk = 0;
    let met = 0;

    for (const instance of instances) {
      const status = instance.status as SLAStatus;
      if (status === "breached") {
        breached++;
      } else if (status === "met") {
        met++;
      } else if (status === "active" || status === "paused") {
        active++;
        const percentRemaining =
          instance.targetDuration > 0
            ? ((instance.remainingTime ?? 0) / instance.targetDuration) * 100
            : 0;
        if (percentRemaining <= 20) atRisk++;
      }
    }

    return { active, breached, atRisk, met };
  }, [instances]);

  if (isLoading) return <SLADashboardSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("title")}</CardDescription>
            <CardTitle className="text-2xl">{stats.active}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-green-600" aria-hidden="true" />
              Active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("breached")}</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {stats.breached}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldX className="size-4 text-destructive" aria-hidden="true" />
              {t("breached")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("atRisk")}</CardDescription>
            <CardTitle className="text-2xl text-yellow-600 dark:text-yellow-400">
              {stats.atRisk}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle
                className="size-4 text-yellow-600 dark:text-yellow-400"
                aria-hidden="true"
              />
              {t("atRisk")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("onTrack")}</CardDescription>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              {stats.met}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-green-600" aria-hidden="true" />
              Met
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA instances table */}
      {instances.length === 0 ? (
        <EmptyState
          icon={<Clock className="size-12" />}
          title={t("title")}
          description="No SLA instances found."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SLA</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[200px]">{t("timeRemaining")}</TableHead>
                <TableHead className="w-[120px]">{t("target")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance: SLAInstance) => {
                const status = (instance.status ?? "active") as SLAStatus;
                const targetDuration = instance.targetDuration ?? 0;
                const remainingTime = instance.remainingTime ?? 0;
                const percentRemaining =
                  targetDuration > 0
                    ? Math.max(0, Math.min(100, (remainingTime / targetDuration) * 100))
                    : 0;
                const statusColor = getStatusColor(status, percentRemaining);
                const progressClass = getProgressClass(status, percentRemaining);

                return (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">
                      {instance.slaConfig?.name ?? instance.slaConfigId}
                    </TableCell>
                    <TableCell className="text-primary">
                      {instance.issue?.key ?? instance.issueId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "breached"
                            ? "destructive"
                            : status === "met"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-medium", statusColor)}>
                            {formatTimeRemaining(remainingTime)}
                          </span>
                          <span className="text-muted-foreground">
                            {Math.round(percentRemaining)}%
                          </span>
                        </div>
                        <Progress
                          value={percentRemaining}
                          className={cn("h-2", progressClass)}
                          aria-label={`${Math.round(percentRemaining)}% time remaining`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimeRemaining(targetDuration)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the SLA dashboard.
 */
function SLADashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

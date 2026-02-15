/**
 * SailPoint sync log viewer component.
 *
 * Displays recent sync activity log entries with status badges,
 * timestamps, and action details.
 *
 * @module integrations/sailpoint/components/SailPointSyncLogViewer
 */
"use client";

import { useTranslations } from "next-intl";
import {
  UserPlus,
  UserMinus,
  RefreshCw,
  AlertTriangle,
  Activity,
  Loader2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
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
import { trpc } from "@/shared/lib/trpc";

/**
 * Displays a table of recent SailPoint sync log entries.
 */
export function SailPointSyncLogViewer() {
  const t = useTranslations("integrations.sailpoint");
  const tc = useTranslations("common");

  const { data: logs, isLoading } = trpc.sailpoint.getSyncLogs.useQuery(
    { limit: 50 },
  );

  function getActionIcon(action: string) {
    switch (action) {
      case "user_added":
        return <UserPlus className="size-4 text-green-600" aria-hidden="true" />;
      case "user_removed":
        return <UserMinus className="size-4 text-orange-600" aria-hidden="true" />;
      case "group_synced":
        return <RefreshCw className="size-4 text-blue-600" aria-hidden="true" />;
      case "full_sync":
        return <Activity className="size-4 text-purple-600" aria-hidden="true" />;
      case "error":
        return <AlertTriangle className="size-4 text-red-600" aria-hidden="true" />;
      default:
        return <Activity className="size-4 text-muted-foreground" aria-hidden="true" />;
    }
  }

  function getActionLabel(action: string): string {
    switch (action) {
      case "user_added":
        return t("actionUserAdded");
      case "user_removed":
        return t("actionUserRemoved");
      case "group_synced":
        return t("actionGroupSynced");
      case "full_sync":
        return t("actionFullSync");
      case "error":
        return t("actionError");
      default:
        return action;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
          >
            {t("statusSuccess")}
          </Badge>
        );
      case "failure":
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
          >
            {t("statusFailure")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function formatTimestamp(date: Date | string) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(d);
  }

  function formatDetails(details: unknown): string {
    if (!details || typeof details !== "object") return "";
    const d = details as Record<string, unknown>;
    const parts: string[] = [];
    if (d.userEmail) parts.push(String(d.userEmail));
    if (d.groupName) parts.push(String(d.groupName));
    if (typeof d.added === "number" || typeof d.removed === "number") {
      parts.push(`+${d.added ?? 0} / -${d.removed ?? 0}`);
    }
    if (d.mappingCount !== undefined) {
      parts.push(`${d.mappingCount} ${t("mappings")}`);
    }
    return parts.join(" | ");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("syncLogsTitle")}</CardTitle>
        <CardDescription>{t("syncLogsDescription")}</CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !logs?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSyncLogs")}</p>
            <p className="text-xs text-muted-foreground">{t("noSyncLogsDescription")}</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("logDetails")}</TableHead>
                  <TableHead>{t("timestamp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionIcon(log.action)}</TableCell>
                    <TableCell className="font-medium">
                      {getActionLabel(log.action)}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {log.error ? (
                        <span className="text-red-600 dark:text-red-400">
                          {log.error}
                        </span>
                      ) : (
                        formatDetails(log.details)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ImportHistoryList component.
 *
 * @description Table of past import jobs showing file name, status badge,
 * total/success/error counts, date, and progress bar.
 *
 * @module ImportHistoryList
 */

"use client";

import { useTranslations } from "next-intl";
import { FileSpreadsheet, Inbox } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

/**
 * ImportHistoryList renders a table of past asset import jobs.
 *
 * @returns Import history table component
 */
export function ImportHistoryList() {
  const t = useTranslations("assets");

  const { data: jobs, isLoading } = trpc.asset.listImportJobs.useQuery({
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        icon={<FileSpreadsheet className="size-12" />}
        title={t("import_no_history")}
        description={t("import_no_history_description")}
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("import_file_name")}</TableHead>
            <TableHead className="w-[110px]">{t("status")}</TableHead>
            <TableHead className="w-[100px]">{t("import_progress")}</TableHead>
            <TableHead className="w-[80px]">{t("import_success_count")}</TableHead>
            <TableHead className="w-[80px]">{t("import_error_count")}</TableHead>
            <TableHead className="w-[140px]">{t("created")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const progress =
              job.totalRows > 0
                ? Math.round((job.processedRows / job.totalRows) * 100)
                : 0;

            return (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium">{job.fileName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <ImportStatusBadge status={job.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2 w-16" />
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-green-600 dark:text-green-400">{job.successCount}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-destructive">{job.errorCount}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(job.createdAt))}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const t = useTranslations("assets");

  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    processing: "secondary",
    completed: "default",
    failed: "destructive",
  };

  return (
    <Badge variant={variants[status] ?? "outline"}>
      {t(`import_status_${status}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

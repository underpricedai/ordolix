"use client";

import { useTranslations } from "next-intl";
import {
  Plus,
  BarChart3,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Share2,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any;

/**
 * Reports page listing saved reports with links to the report builder.
 *
 * @description Shows a table of saved reports with name, type, shared status,
 * and actions. Includes a create report button linking to ReportBuilder.
 */
export default function ReportsPage() {
  const t = useTranslations("reports");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const {
    data: reportsData,
    isLoading,
    error,
  } = trpc.report.list.useQuery({}, { enabled: true });

  const reports: Report[] = reportsData ?? [];

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("reports") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage custom reports and dashboards.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createReport")}
          </Button>
        </div>

        {/* Reports table */}
        {isLoading ? (
          <ReportsTableSkeleton />
        ) : error ? (
          <EmptyState
            icon={<BarChart3 className="size-12" />}
            title={tc("error")}
            description={error.message}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                {tc("retry")}
              </Button>
            }
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="size-12" />}
            title={t("title")}
            description="No reports created yet. Build your first report."
            action={
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createReport")}
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reportName")}</TableHead>
                  <TableHead className="w-[160px]">{t("reportType")}</TableHead>
                  <TableHead className="w-[100px]">Visibility</TableHead>
                  <TableHead className="w-[140px]">{t("schedule")}</TableHead>
                  <TableHead className="w-[60px]">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: Report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium">{report.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {report.reportType?.replace("_", " ") ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.isShared ? (
                        <Badge>
                          <Share2 className="mr-1 size-3" aria-hidden="true" />
                          {t("shared")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t("private")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report.schedule ? report.schedule.cron : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`${tc("actions")} for ${report.name}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Play className="mr-2 size-4" aria-hidden="true" />
                            {t("runReport")}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="mr-2 size-4" aria-hidden="true" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 size-4" aria-hidden="true" />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the reports table.
 */
function ReportsTableSkeleton() {
  return (
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
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="size-6" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

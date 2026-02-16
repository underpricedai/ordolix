"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any;

/**
 * Reports page listing saved reports with links to the report builder.
 *
 * @description Shows a table of saved reports with name, type, shared status,
 * and actions. Includes a create report dialog with name, type, and description fields.
 */
export default function ReportsPage() {
  const t = useTranslations("reports");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState<string>("issue_summary");
  const [description, setDescription] = useState("");

  const {
    data: reportsData,
    isLoading,
    error,
    refetch,
  } = trpc.report.list.useQuery({}, { enabled: true });

  const createMutation = trpc.report.create.useMutation({
    onSuccess: async (data) => {
      setCreateOpen(false);
      setReportName("");
      setReportType("issue_summary");
      setDescription("");
      await refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newReport = data as any;
      if (newReport?.id) {
        router.push(`/reports/${newReport.id}`);
      }
    },
  });

  const reports: Report[] = reportsData ?? [];

  const handleCreate = () => {
    if (!reportName.trim()) return;
    createMutation.mutate({
      name: reportName.trim(),
      reportType: reportType as "issue_summary" | "time_tracking" | "sla_compliance" | "velocity" | "custom",
      query: {},
      description: description.trim() || undefined,
    });
  };

  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t("createReport")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createReport")}</DialogTitle>
          <DialogDescription>{t("createReportDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="report-name">{t("reportName")}</Label>
            <Input
              id="report-name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder={t("reportNamePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("reportType")}</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger aria-label={t("reportType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issue_summary">{t("reportTypeIssueSummary")}</SelectItem>
                <SelectItem value="time_tracking">{t("reportTypeTimeTracking")}</SelectItem>
                <SelectItem value="sla_compliance">{t("reportTypeSlaCompliance")}</SelectItem>
                <SelectItem value="velocity">{t("reportTypeVelocity")}</SelectItem>
                <SelectItem value="custom">{t("reportTypeCustom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-description">{t("description")}</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!reportName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? tc("saving") : tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
              {t("pageDescription")}
            </p>
          </div>
          {createButton}
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
            title={t("noReports")}
            description={t("noReportsDescription")}
            action={createButton}
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reportName")}</TableHead>
                  <TableHead className="w-[160px]">{t("reportType")}</TableHead>
                  <TableHead className="w-[100px]">{tc("status")}</TableHead>
                  <TableHead className="w-[140px]">{t("schedule")}</TableHead>
                  <TableHead className="w-[60px]">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: Report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/reports/${report.id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/reports/${report.id}`}
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium hover:underline">{report.name}</span>
                      </Link>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/reports/${report.id}`}>
                              <Play className="mr-2 size-4" aria-hidden="true" />
                              {t("runReport")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/reports/${report.id}`}>
                              <Pencil className="mr-2 size-4" aria-hidden="true" />
                              {tc("edit")}
                            </Link>
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

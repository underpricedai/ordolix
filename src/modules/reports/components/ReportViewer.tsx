"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  Download,
  FileText,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from "@/shared/components/charts";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  ResponsiveTable,
  type ResponsiveColumnDef,
} from "@/shared/components/responsive-table";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

interface ReportViewerProps {
  /** The report ID to display */
  reportId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportData = any;

/**
 * ReportViewer displays a generated report with chart area and data table.
 *
 * @description Shows the report title, metadata, a chart rendering area (placeholder),
 * a data table below the chart, and export buttons for CSV and PDF.
 * Uses tRPC report.getById query and report.run for data.
 *
 * @param props - ReportViewerProps
 * @returns Report viewer component
 */
export function ReportViewer({ reportId }: ReportViewerProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");

  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = trpc.report.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId },
  );

  const {
    data: reportResult,
    isLoading: resultLoading,
    error: resultError,
    refetch,
  } = trpc.report.run.useQuery(
    { id: reportId },
    { enabled: !!reportId },
  );

  const isLoading = reportLoading || resultLoading;
  const error = reportError || resultError;

  if (isLoading) return <ReportViewerSkeleton />;

  if (error || !report) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-12" />}
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

  const resultData: ReportData = reportResult;
  const resultRows: Record<string, unknown>[] = resultData?.rows ?? [];
  const resultColumns: string[] = resultData?.columns ?? [];

  return (
    <div className="space-y-6">
      {/* Report header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {report.name}
          </h2>
          {report.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {report.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">
              {report.reportType?.replace("_", " ")}
            </Badge>
            {(report.visualization as { type?: string } | null)?.type && (
              <Badge variant="outline">
                {((report.visualization as { type?: string }).type ?? "").replace("_", " ")}
              </Badge>
            )}
            {report.isShared && (
              <Badge>
                <Share2 className="mr-1 size-3" aria-hidden="true" />
                {t("shared")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            <RefreshCw className="mr-1 size-3.5" aria-hidden="true" />
            {tc("refresh")}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1 size-3.5" aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-1 size-3.5" aria-hidden="true" />
            PDF
          </Button>
        </div>
      </div>

      {/* Chart area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportChart
            visualization={report.visualization as Record<string, unknown> | null}
            rows={resultRows}
            columns={resultColumns}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Data table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>
            {tc("itemCount", { count: resultRows.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resultRows.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="size-12" />}
              title={t("noData")}
              description="Run the report to see results."
            />
          ) : (
            <div className="rounded-md border">
              <ResponsiveTable
                columns={resultColumns.map(
                  (col: string, idx: number): ResponsiveColumnDef<Record<string, unknown>> => ({
                    key: col,
                    header: col,
                    cell: (row) => <>{String(row[col] ?? "-")}</>,
                    priority: idx < 2 ? 1 : idx + 2,
                  }),
                )}
                data={resultRows}
                rowKey={(row) =>
                  resultColumns
                    .slice(0, 3)
                    .map((col) => String(row[col] ?? ""))
                    .join("|")
                }
                mobileCard={(row) => (
                  <Card className="p-3">
                    {resultColumns.slice(0, 3).map((col: string) => (
                      <div key={col} className="flex items-center justify-between py-0.5">
                        <span className="text-xs text-muted-foreground">{col}</span>
                        <span className="text-sm font-medium">
                          {String(row[col] ?? "-")}
                        </span>
                      </div>
                    ))}
                  </Card>
                )}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between text-sm text-muted-foreground">
          <span>
            {tc("itemCount", { count: resultRows.length })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-1 size-3.5" aria-hidden="true" />
              {tc("export")} CSV
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="mr-1 size-3.5" aria-hidden="true" />
              {tc("export")} PDF
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Renders the correct chart type based on report visualization config.
 */
function ReportChart({
  visualization,
  rows,
  columns,
}: {
  visualization: Record<string, unknown> | null;
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  const vizType = (visualization?.type as string) ?? "bar";
  const xAxisKey = (visualization?.xAxis as string) ?? columns[0] ?? "name";
  const rawYAxis = visualization?.yAxis;
  const yAxisKeys = Array.isArray(rawYAxis) ? rawYAxis as string[] : columns.slice(1);

  if (rows.length === 0) {
    return (
      <div
        className="flex min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30"
        role="img"
        aria-label="Chart visualization area"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-12" aria-hidden="true" />
          <p className="text-sm">No data to chart</p>
        </div>
      </div>
    );
  }

  const chartData = rows.map((row) => {
    const entry: Record<string, string | number> = {
      [xAxisKey]: String(row[xAxisKey] ?? ""),
    };
    for (const key of yAxisKeys) {
      entry[key] = Number(row[key]) || 0;
    }
    return entry;
  });

  if (vizType === "pie" || vizType === "donut") {
    const pieData = chartData.map((row) => ({
      name: String(row[xAxisKey]),
      value: Number(row[yAxisKeys[0] ?? "value"]) || 0,
    }));
    return (
      <PieChartWidget
        data={pieData}
        height={300}
        innerRadius={vizType === "donut" ? 60 : 0}
        showLabels
      />
    );
  }

  if (vizType === "line") {
    return (
      <LineChartWidget
        data={chartData}
        xAxisKey={xAxisKey}
        lines={yAxisKeys.map((key, i) => ({
          dataKey: key,
          name: key,
          color: `hsl(var(--chart-${(i % 5) + 1}, 220 70% 50%))`,
        }))}
        height={300}
        showLegend={yAxisKeys.length > 1}
      />
    );
  }

  return (
    <BarChartWidget
      data={chartData}
      xAxisKey={xAxisKey}
      bars={yAxisKeys.map((key, i) => ({
        dataKey: key,
        name: key,
        color: `hsl(var(--chart-${(i % 5) + 1}, 220 70% 50%))`,
      }))}
      height={300}
      showLegend={yAxisKeys.length > 1}
    />
  );
}

/**
 * Skeleton loading state for the report viewer.
 */
function ReportViewerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

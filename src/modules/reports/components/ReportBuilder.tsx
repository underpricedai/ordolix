"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Table2,
  PieChart,
  LineChart,
  Save,
  Play,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Separator } from "@/shared/components/ui/separator";
import { Badge } from "@/shared/components/ui/badge";
import { trpc } from "@/shared/lib/trpc";

/** Report types available in the builder */
const REPORT_TYPES = [
  { value: "issue_summary", label: "Issue Summary", icon: Table2 },
  { value: "time_tracking", label: "Time Tracking", icon: BarChart3 },
  { value: "sla_compliance", label: "SLA Compliance", icon: PieChart },
  { value: "velocity", label: "Velocity", icon: LineChart },
  { value: "custom", label: "Custom Report", icon: BarChart3 },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

/** Visualization types */
const VIZ_TYPES = [
  { value: "table", label: "Table", icon: Table2 },
  { value: "bar_chart", label: "Bar Chart", icon: BarChart3 },
  { value: "line_chart", label: "Line Chart", icon: LineChart },
  { value: "pie_chart", label: "Pie Chart", icon: PieChart },
  { value: "area_chart", label: "Area Chart", icon: BarChart3 },
] as const;

type VizType = (typeof VIZ_TYPES)[number]["value"];

/** Data sources for the report */
const DATA_SOURCES = [
  { value: "issues", label: "Issues" },
  { value: "time_logs", label: "Time Logs" },
  { value: "sla_instances", label: "SLA Instances" },
] as const;

/** Grouping options */
const GROUP_BY_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "type", label: "Issue Type" },
  { value: "project", label: "Project" },
  { value: "created_date", label: "Created Date" },
  { value: "resolved_date", label: "Resolved Date" },
] as const;

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ReportBuilderProps {
  /** Existing report ID for editing */
  reportId?: string;
  /** Called after successful save */
  onSuccess?: () => void;
}

/**
 * ReportBuilder renders a report configuration form with preview panel.
 *
 * @description Allows users to configure report type, visualization, data source,
 * filters, grouping, and aggregation. Includes a preview panel placeholder.
 * Uses tRPC report.create and report.generate mutations.
 *
 * @param props - ReportBuilderProps
 * @returns Report builder component
 */
export function ReportBuilder({ reportId, onSuccess }: ReportBuilderProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");

  const isEditing = !!reportId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("issue_summary");
  const [vizType, setVizType] = useState<VizType>("table");
  const [dataSource, setDataSource] = useState("issues");
  const [groupBy, setGroupBy] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const createMutation = trpc.report.create.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: "status", operator: "equals", value: "" },
    ]);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFilter = useCallback(
    (id: string, key: keyof FilterRow, value: string) => {
      setFilters((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
      );
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      createMutation.mutate({
        name,
        reportType,
        description: description || undefined,
        query: {
          dataSource,
          groupBy: groupBy || undefined,
          filters: filters.map(({ field, operator, value }) => ({
            field,
            operator,
            value,
          })),
        },
        visualization: { type: vizType, config: {} },
        isShared: false,
      });
    },
    [name, reportType, description, dataSource, groupBy, filters, vizType, createMutation],
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_1fr]">
        {/* Configuration panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? t("title") : t("createReport")}</CardTitle>
              <CardDescription>
                Configure your report data source, filters, and visualization.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Report name */}
              <div className="grid gap-2">
                <Label htmlFor="report-name">{t("reportName")}</Label>
                <Input
                  id="report-name"
                  placeholder="e.g., Sprint Velocity Report"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="report-desc">Description</Label>
                <Textarea
                  id="report-desc"
                  placeholder="Describe the report..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <Separator />

              {/* Report type */}
              <div className="grid gap-2">
                <Label>{t("reportType")}</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {REPORT_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    return (
                      <Button
                        key={rt.value}
                        type="button"
                        variant={reportType === rt.value ? "default" : "outline"}
                        className="flex h-auto flex-col gap-1 py-3"
                        onClick={() => setReportType(rt.value)}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        <span className="text-xs">{rt.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Data source */}
              <div className="grid gap-2">
                <Label htmlFor="report-source">Data Source</Label>
                <Select value={dataSource} onValueChange={setDataSource}>
                  <SelectTrigger id="report-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((ds) => (
                      <SelectItem key={ds.value} value={ds.value}>
                        {ds.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Visualization type */}
              <div className="grid gap-2">
                <Label>Visualization</Label>
                <div className="flex flex-wrap gap-2">
                  {VIZ_TYPES.map((v) => {
                    const Icon = v.icon;
                    return (
                      <Button
                        key={v.value}
                        type="button"
                        variant={vizType === v.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVizType(v.value)}
                      >
                        <Icon className="mr-1 size-3.5" aria-hidden="true" />
                        {v.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Grouping */}
              <div className="grid gap-2">
                <Label htmlFor="report-group">Group By</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger id="report-group" className="w-full">
                    <SelectValue placeholder="No grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No grouping</SelectItem>
                    {GROUP_BY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{tc("filter")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFilter}
                  >
                    <Plus className="mr-1 size-3.5" aria-hidden="true" />
                    Add Filter
                  </Button>
                </div>
                {filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No filters applied. All data will be included.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border p-2 sm:flex-nowrap"
                      >
                        <Select
                          value={filter.field}
                          onValueChange={(v) =>
                            updateFilter(filter.id, "field", v)
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GROUP_BY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filter.operator}
                          onValueChange={(v) =>
                            updateFilter(filter.id, "operator", v)
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">equals</SelectItem>
                            <SelectItem value="not_equals">not equals</SelectItem>
                            <SelectItem value="contains">contains</SelectItem>
                            <SelectItem value="in">in</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Value"
                          value={filter.value}
                          onChange={(e) =>
                            updateFilter(filter.id, "value", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeFilter(filter.id)}
                          aria-label="Remove filter"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline">
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name}
              >
                {createMutation.isPending ? (
                  tc("loading")
                ) : (
                  <>
                    <Save className="mr-2 size-4" aria-hidden="true" />
                    {tc("save")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Preview panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Report preview will appear here when generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-lg bg-muted p-6">
                {vizType === "bar_chart" && (
                  <BarChart3
                    className="size-16 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {vizType === "line_chart" && (
                  <LineChart
                    className="size-16 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {vizType === "pie_chart" && (
                  <PieChart
                    className="size-16 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {vizType === "table" && (
                  <Table2
                    className="size-16 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {vizType === "area_chart" && (
                  <BarChart3
                    className="size-16 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Chart renders here
              </p>
              <div className="flex gap-2">
                {name && (
                  <Badge variant="secondary">{name}</Badge>
                )}
                <Badge variant="outline">{vizType.replace("_", " ")}</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t pt-4">
            <Button type="button" variant="outline" disabled={!name}>
              <Play className="mr-2 size-4" aria-hidden="true" />
              {t("runReport")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}

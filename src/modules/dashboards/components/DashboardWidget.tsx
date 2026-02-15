"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  GripVertical,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  Settings2,
  Trash2,
  TrendingUp,
  List,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type { WidgetType } from "@/modules/dashboards/types/schemas";
import { BarChartWidget, PieChartWidget } from "@/shared/components/charts";
import { BurndownWidget } from "./BurndownWidget";
import { VelocityTrendWidget } from "./VelocityTrendWidget";
import { CumulativeFlowWidget } from "./CumulativeFlowWidget";

/**
 * Data shape for a dashboard widget.
 */
export interface WidgetData {
  id: string;
  title: string;
  widgetType: WidgetType;
  data?: unknown;
  isLoading?: boolean;
  config?: Record<string, unknown>;
}

interface DashboardWidgetProps {
  /** Widget data */
  widget: WidgetData;
  /** Whether the dashboard is in edit mode */
  isEditMode?: boolean;
  /** Callback to refresh widget data */
  onRefresh?: (id: string) => void;
  /** Callback to edit widget settings */
  onEdit?: (id: string) => void;
  /** Callback to remove widget */
  onRemove?: (id: string) => void;
}

const widgetTypeIcons: Record<string, React.ElementType> = {
  issueCount: TrendingUp,
  statusBreakdown: BarChart3,
  assigneeWorkload: BarChart3,
  recentActivity: List,
  priorityDistribution: BarChart3,
  sprintBurndown: TrendingUp,
  burndown: TrendingUp,
  velocityTrend: BarChart3,
  cumulativeFlow: BarChart3,
  custom: Settings2,
};

/**
 * DashboardWidget renders a single widget card on the dashboard.
 *
 * @description Displays a card with a title bar, content area that renders based
 * on the widget type (chart, table, metric, or list), and a refresh button. In
 * edit mode, shows a resize handle and edit/remove buttons.
 *
 * @param props - DashboardWidgetProps
 * @returns A widget card component
 *
 * @example
 * <DashboardWidget widget={widgetData} isEditMode={false} onRefresh={handleRefresh} />
 */
export function DashboardWidget({
  widget,
  isEditMode = false,
  onRefresh,
  onEdit,
  onRemove,
}: DashboardWidgetProps) {
  const t = useTranslations("dashboards");
  const tc = useTranslations("common");

  const Icon = widgetTypeIcons[widget.widgetType] ?? BarChart3;

  return (
    <Card
      className={cn(
        "group relative flex flex-col",
        isEditMode && "ring-2 ring-dashed ring-primary/30",
      )}
      role="article"
      aria-label={widget.title}
    >
      {/* Drag handle (edit mode) */}
      {isEditMode && (
        <div
          className="absolute -left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={t("dragWidget")}
        >
          <GripVertical className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      {/* Widget header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {widget.title}
        </CardTitle>

        <div className="flex items-center gap-1">
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onRefresh?.(widget.id)}
            aria-label={tc("refresh")}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>

          {/* Widget menu (edit mode or always) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={tc("more")}
              >
                <MoreHorizontal className="size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(widget.id)}>
                <Settings2 className="mr-2 size-4" aria-hidden="true" />
                {t("editWidget")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Maximize2 className="mr-2 size-4" aria-hidden="true" />
                {t("expandWidget")}
              </DropdownMenuItem>
              {isEditMode && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemove?.(widget.id)}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    {t("removeWidget")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Widget content */}
      <CardContent className="flex-1">
        {widget.isLoading ? (
          <WidgetContentSkeleton type={widget.widgetType} />
        ) : (
          <WidgetContent type={widget.widgetType} data={widget.data} />
        )}
      </CardContent>

      {/* Resize handle (edit mode) */}
      {isEditMode && (
        <div
          className="absolute bottom-0 right-0 size-4 cursor-se-resize opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={t("resizeWidget")}
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          >
            <path
              d="M14 14L14 10M14 14L10 14M14 14L6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      )}
    </Card>
  );
}

/**
 * Renders widget content based on the widget type.
 */
function WidgetContent({
  type,
  data,
}: {
  type: WidgetType;
  data: unknown;
}) {
  const t = useTranslations("dashboards");
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 200 : 300;

  switch (type) {
    case "issueCount": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metricData = data as any;
      return (
        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-4xl font-bold text-foreground">
            {metricData?.count ?? 0}
          </span>
          <span className="mt-1 text-sm text-muted-foreground">
            {metricData?.label ?? t("totalIssues")}
          </span>
          {metricData?.trend != null && (
            <Badge
              variant="outline"
              className={cn(
                "mt-2 border-transparent text-xs",
                metricData.trend > 0
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              )}
            >
              {metricData.trend > 0 ? "+" : ""}
              {metricData.trend}%
            </Badge>
          )}
        </div>
      );
    }

    case "recentActivity": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activities = (data as any)?.items ?? [];
      return (
        <div className="space-y-3 py-2" role="list">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            activities.slice(0, 5).map(
              (
                item: { id: string; text: string; time: string },
              ) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2"
                  role="listitem"
                >
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1 text-xs">
                    <p className="text-foreground">{item.text}</p>
                    <p className="text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      );
    }

    case "statusBreakdown":
    case "priorityDistribution": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pieItems = (data as any)?.items ?? [];
      if (pieItems.length === 0) {
        return (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        );
      }
      return (
        <PieChartWidget
          data={pieItems.map((item: { label: string; value: number }) => ({
            name: item.label,
            value: item.value,
          }))}
          height={chartHeight}
          showLabels={!isMobile}
          showLegend={!isMobile}
        />
      );
    }

    case "assigneeWorkload": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const barItems = (data as any)?.items ?? [];
      if (barItems.length === 0) {
        return (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        );
      }
      return (
        <BarChartWidget
          data={barItems.map((item: { label: string; value: number }) => ({
            name: item.label,
            count: item.value,
          }))}
          xAxisKey="name"
          bars={[{ dataKey: "count", name: "Issues", color: "hsl(var(--chart-1, 220 70% 50%))" }]}
          height={chartHeight}
        />
      );
    }

    case "sprintBurndown":
    case "burndown": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const burndownData = (data as any)?.days ?? [];
      if (burndownData.length === 0) {
        return (
          <div className="flex h-40 items-center justify-center rounded border-2 border-dashed border-muted">
            <div className="text-center">
              <BarChart3
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("chartPlaceholder")}
              </p>
            </div>
          </div>
        );
      }
      return <BurndownWidget data={burndownData} />;
    }

    case "velocityTrend": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const velocityData = (data as any)?.sprints ?? [];
      if (velocityData.length === 0) {
        return (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        );
      }
      return <VelocityTrendWidget data={velocityData} />;
    }

    case "cumulativeFlow": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfdData = (data as any)?.days ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfdStatuses = (data as any)?.statuses ?? [];
      if (cfdData.length === 0) {
        return (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        );
      }
      return <CumulativeFlowWidget data={cfdData} statuses={cfdStatuses} />;
    }

    default: {
      return (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </div>
      );
    }
  }
}

/**
 * Skeleton for widget content.
 */
function WidgetContentSkeleton({ type }: { type: WidgetType }) {
  if (type === "issueCount") {
    return (
      <div className="flex flex-col items-center py-4">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

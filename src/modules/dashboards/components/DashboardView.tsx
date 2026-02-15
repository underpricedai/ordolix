"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { DashboardWidget, type WidgetData } from "./DashboardWidget";
import type { WidgetType } from "@/modules/dashboards/types/schemas";

interface DashboardViewProps {
  /** Dashboard ID to display */
  dashboardId: string;
}

/**
 * DashboardView renders a dashboard with its widget grid layout.
 *
 * @description Displays a grid of widget cards based on the dashboard configuration.
 * Each widget renders its own content based on type (chart, table, metric, list).
 * Includes an edit mode toggle for rearranging widgets and an add-widget dialog.
 *
 * @param props - DashboardViewProps
 * @returns The dashboard grid view
 *
 * @example
 * <DashboardView dashboardId="dash-123" />
 */
export function DashboardView({ dashboardId }: DashboardViewProps) {
  const t = useTranslations("dashboards");
  const tc = useTranslations("common");

  const [isEditMode, setIsEditMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [newWidgetTitle, setNewWidgetTitle] = useState("");
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>("issueCount");

  // tRPC query for dashboard data
  const { data: dashboardData, isLoading, error } = trpc.dashboard.getById.useQuery(
    { id: dashboardId },
    { enabled: Boolean(dashboardId) },
  );

  // tRPC mutations
  const addWidgetMutation = trpc.dashboard.addWidget.useMutation();
  const removeWidgetMutation = trpc.dashboard.deleteWidget.useMutation();

  // Parse dashboard data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashboard = dashboardData as any;
  const widgets: WidgetData[] = useMemo(() => {
    if (!Array.isArray(dashboard?.widgets)) return [];
    return dashboard.widgets as WidgetData[];
  }, [dashboard]);

  const handleAddWidget = useCallback(async () => {
    if (!newWidgetTitle.trim()) return;

    await addWidgetMutation.mutateAsync({
      dashboardId,
      title: newWidgetTitle.trim(),
      widgetType: newWidgetType,
    });

    setNewWidgetTitle("");
    setNewWidgetType("issueCount");
    setAddWidgetOpen(false);
  }, [dashboardId, newWidgetTitle, newWidgetType, addWidgetMutation]);

  const handleRemoveWidget = useCallback(
    async (widgetId: string) => {
      await removeWidgetMutation.mutateAsync({ id: widgetId });
    },
    [removeWidgetMutation],
  );

  const handleRefreshWidget = useCallback((_widgetId: string) => {
    // In production, would refetch individual widget data
    // For now, just trigger a full refetch
  }, []);

  if (isLoading) {
    return <DashboardViewSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="size-12" />}
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
      {/* Dashboard header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {dashboard?.name ?? t("untitled")}
          </h2>
          {dashboard?.isShared && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {t("shared")}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit mode toggle */}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            aria-pressed={isEditMode}
          >
            <Pencil className="mr-1.5 size-3.5" aria-hidden="true" />
            {isEditMode ? t("doneEditing") : t("editLayout")}
          </Button>

          {/* Add widget */}
          <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
                {t("addWidget")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("addWidget")}</DialogTitle>
                <DialogDescription>{t("addWidgetDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="widget-title">{t("widgetTitle")}</Label>
                  <Input
                    id="widget-title"
                    value={newWidgetTitle}
                    onChange={(e) => setNewWidgetTitle(e.target.value)}
                    placeholder={t("widgetTitlePlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("widgetType")}</Label>
                  <Select
                    value={newWidgetType}
                    onValueChange={(v) => setNewWidgetType(v as WidgetType)}
                  >
                    <SelectTrigger aria-label={t("widgetType")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="issueCount">
                        {t("widgetTypeIssueCount")}
                      </SelectItem>
                      <SelectItem value="statusBreakdown">
                        {t("widgetTypeStatusBreakdown")}
                      </SelectItem>
                      <SelectItem value="assigneeWorkload">
                        {t("widgetTypeAssigneeWorkload")}
                      </SelectItem>
                      <SelectItem value="recentActivity">
                        {t("widgetTypeRecentActivity")}
                      </SelectItem>
                      <SelectItem value="priorityDistribution">
                        {t("widgetTypePriorityDistribution")}
                      </SelectItem>
                      <SelectItem value="sprintBurndown">
                        {t("widgetTypeSprintBurndown")}
                      </SelectItem>
                      <SelectItem value="custom">
                        {t("widgetTypeCustom")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddWidgetOpen(false)}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleAddWidget}
                  disabled={!newWidgetTitle.trim()}
                >
                  {t("addWidget")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Widget grid */}
      {widgets.length === 0 ? (
        <EmptyState
          icon={<LayoutDashboard className="size-12" />}
          title={t("emptyDashboard")}
          description={t("emptyDashboardDescription")}
          action={
            <Button onClick={() => setAddWidgetOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("addWidget")}
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            "grid gap-4",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          )}
          role="region"
          aria-label={t("widgetGrid")}
        >
          {widgets.map((widget) => (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              onRefresh={handleRefreshWidget}
              onRemove={handleRemoveWidget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for DashboardView.
 */
function DashboardViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="size-6" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

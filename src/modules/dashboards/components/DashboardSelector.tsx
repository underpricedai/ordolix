"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Plus,
  Share2,
  User,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Switch } from "@/shared/components/ui/switch";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Dashboard item in the selector list.
 */
interface DashboardItem {
  id: string;
  name: string;
  isShared: boolean;
  widgetCount: number;
  updatedAt: string;
}

interface DashboardSelectorProps {
  /** Currently active dashboard ID */
  activeDashboardId?: string;
  /** Callback when a dashboard is selected */
  onSelect: (id: string) => void;
}

/**
 * DashboardSelector renders a list of available dashboards for navigation.
 *
 * @description Shows personal and shared dashboards with a create button.
 * The active dashboard is highlighted. Each item shows the name, shared badge,
 * widget count, and last updated date.
 *
 * @param props - DashboardSelectorProps
 * @returns A dashboard picker component
 *
 * @example
 * <DashboardSelector activeDashboardId="dash-1" onSelect={setActiveDashboard} />
 */
export function DashboardSelector({
  activeDashboardId,
  onSelect,
}: DashboardSelectorProps) {
  const t = useTranslations("dashboards");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIsShared, setNewIsShared] = useState(false);

  // tRPC query for dashboard list
  const { data: dashboardsData, isLoading } = trpc.dashboard.list.useQuery(
    undefined,
    { enabled: true },
  );

  const createMutation = trpc.dashboard.create.useMutation();

  const dashboards: DashboardItem[] =
    (dashboardsData as { items?: DashboardItem[] })?.items ?? [];

  const personalDashboards = dashboards.filter((d) => !d.isShared);
  const sharedDashboards = dashboards.filter((d) => d.isShared);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createMutation.mutateAsync({
      name: newName.trim(),
      isShared: newIsShared,
    });
    setNewName("");
    setNewIsShared(false);
    setCreateOpen(false);
  };

  if (isLoading) {
    return <DashboardSelectorSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        <ResponsiveDialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createDashboard")}
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("createDashboard")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("createDashboardDescription")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dashboard-name">{t("dashboardName")}</Label>
              <Input
                id="dashboard-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("dashboardNamePlaceholder")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="dashboard-shared"
                checked={newIsShared}
                onCheckedChange={setNewIsShared}
              />
              <Label htmlFor="dashboard-shared">{t("sharedDashboard")}</Label>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              {tc("create")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dashboard sections */}
      <ScrollArea className="max-h-[400px]">
        {dashboards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="size-8" />}
            title={t("noDashboards")}
            description={t("noDashboardsDescription")}
          />
        ) : (
          <div className="space-y-4">
            {/* Personal dashboards */}
            {personalDashboards.length > 0 && (
              <DashboardGroup
                label={t("personalDashboards")}
                icon={<User className="size-3.5" aria-hidden="true" />}
                dashboards={personalDashboards}
                activeDashboardId={activeDashboardId}
                onSelect={onSelect}
              />
            )}

            {/* Shared dashboards */}
            {sharedDashboards.length > 0 && (
              <DashboardGroup
                label={t("sharedDashboards")}
                icon={<Share2 className="size-3.5" aria-hidden="true" />}
                dashboards={sharedDashboards}
                activeDashboardId={activeDashboardId}
                onSelect={onSelect}
              />
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Renders a group of dashboards under a section label.
 */
function DashboardGroup({
  label,
  icon,
  dashboards,
  activeDashboardId,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  dashboards: DashboardItem[];
  activeDashboardId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <ul className="space-y-1" role="listbox" aria-label={label}>
        {dashboards.map((dashboard) => {
          const isActive = dashboard.id === activeDashboardId;
          return (
            <li key={dashboard.id}>
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted/50",
                )}
                onClick={() => onSelect(dashboard.id)}
              >
                <LayoutDashboard
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1 truncate">
                  <p className="truncate">{dashboard.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard.widgetCount}{" "}
                    {dashboard.widgetCount === 1 ? "widget" : "widgets"}
                  </p>
                </div>
                {dashboard.isShared && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    <Share2 className="mr-1 size-2.5" aria-hidden="true" />
                    Shared
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Skeleton loading state for DashboardSelector.
 */
function DashboardSelectorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-4" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, GanttChart as GanttIcon } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { GanttChart } from "@/modules/gantt/components/GanttChart";
import { trpc } from "@/shared/lib/trpc";

/**
 * Gantt chart page displaying the interactive project timeline.
 *
 * @description Fetches projects, allows single or multi-project selection,
 * and renders the GanttChart for the selected project(s).
 */
export default function GanttPage() {
  const tn = useTranslations("nav");
  const t = useTranslations("gantt");
  const tc = useTranslations("common");

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = trpc.project.list.useQuery({ limit: 50 });

  const projects = useMemo(
    () => (projectsData?.items ?? []) as Array<{ id: string; name: string; key: string }>,
    [projectsData],
  );

  // Default to all projects when nothing is selected
  const activeProjectIds = useMemo(
    () => selectedProjectIds.length > 0 ? selectedProjectIds : projects.map((p) => p.id),
    [selectedProjectIds, projects],
  );

  const toggleProject = useCallback((projectId: string) => {
    setSelectedProjectIds((prev) => {
      if (prev.length === 0) {
        // Currently showing all - switch to all minus this one
        return projects.filter((p) => p.id !== projectId).map((p) => p.id);
      }
      if (prev.includes(projectId)) {
        const next = prev.filter((id) => id !== projectId);
        // Don't allow deselecting all - revert to "all"
        return next.length === 0 ? [] : next;
      }
      const next = [...prev, projectId];
      // If all are selected, treat as "all" (empty = all)
      return next.length === projects.length ? [] : next;
    });
  }, [projects]);

  const selectAll = useCallback(() => {
    setSelectedProjectIds([]);
  }, []);

  const selectionLabel = useMemo(() => {
    if (selectedProjectIds.length === 0) return t("allProjects");
    if (selectedProjectIds.length === 1) {
      const p = projects.find((p) => p.id === selectedProjectIds[0]);
      return p?.name ?? t("selectProjects");
    }
    return t("projectCount", { count: selectedProjectIds.length });
  }, [selectedProjectIds, projects, t]);

  if (projectsLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("gantt") }]} />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  if (projectsError) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("gantt") }]} />
        <div className="flex-1 p-4 sm:p-6">
          <EmptyState
            icon={<GanttIcon className="size-12" />}
            title={tc("error")}
            description={projectsError.message}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                {tc("retry")}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("gantt") }]} />
        <div className="flex-1 p-4 sm:p-6">
          <EmptyState
            icon={<FolderOpen className="size-12" />}
            title="No projects yet"
            description="Create a project first to view the Gantt chart."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("gantt") }]} />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b px-4 sm:px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          {projects.length > 1 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-between">
                  <span className="truncate">{selectionLabel}</span>
                  <Badge variant="secondary" className="ms-2 shrink-0">
                    {activeProjectIds.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-projects"
                      checked={selectedProjectIds.length === 0}
                      onCheckedChange={() => selectAll()}
                    />
                    <Label htmlFor="all-projects" className="cursor-pointer text-sm font-medium">
                      {t("allProjects")}
                    </Label>
                  </div>
                  <div className="border-t pt-2 space-y-2">
                    {projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`project-${p.id}`}
                          checked={activeProjectIds.includes(p.id)}
                          onCheckedChange={() => toggleProject(p.id)}
                        />
                        <Label htmlFor={`project-${p.id}`} className="cursor-pointer text-sm">
                          <span className="font-medium text-muted-foreground">{p.key}</span>
                          <span className="ms-1.5">{p.name}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {activeProjectIds.length > 0 && (
          <GanttChart projectIds={activeProjectIds} />
        )}
      </div>
    </>
  );
}

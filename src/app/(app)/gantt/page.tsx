"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, GanttChart as GanttIcon } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { GanttChart } from "@/modules/gantt/components/GanttChart";
import { trpc } from "@/shared/lib/trpc";

/**
 * Gantt chart page displaying the interactive project timeline.
 *
 * @description Fetches projects, allows project selection, and renders
 * the GanttChart for the selected project.
 */
export default function GanttPage() {
  const tn = useTranslations("nav");
  const t = useTranslations("gantt");
  const tc = useTranslations("common");

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = trpc.project.list.useQuery({ limit: 50 });

  const projects = projectsData?.items ?? [];
  const currentProjectId = selectedProjectId ?? projects[0]?.id;

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
            <Select value={currentProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {currentProjectId && <GanttChart projectId={currentProjectId} />}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { WorkflowEditor } from "@/modules/workflows/components/WorkflowEditor";
import { trpc } from "@/shared/lib/trpc";

/**
 * Shape of a project item returned from the tRPC query.
 */
interface ProjectItem {
  id: string;
  key: string;
  name: string;
}

/**
 * Workflows page with the visual workflow editor.
 *
 * @description Fetches the user's project list and lets them pick which
 * project's workflow to edit. Defaults to the first available project.
 * The editor allows viewing and editing statuses, transitions,
 * validators, and conditions in a visual SVG canvas.
 */
export default function WorkflowsPage() {
  const tn = useTranslations("nav");
  const t = useTranslations("workflows");

  const { data: projectsData, isLoading: projectsLoading } =
    trpc.project.list.useQuery({});

  const projects: ProjectItem[] =
    ((projectsData as { items?: ProjectItem[] })?.items ??
      (projectsData as ProjectItem[] | undefined)) ??
    [];

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  // Use the explicitly selected project, or fall back to the first project
  const projectId = selectedProjectId ?? projects[0]?.id ?? null;

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: tn("workflows") },
        ]}
      />
      <div className="flex flex-1 flex-col">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b px-4 sm:px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>

          {/* Project selector */}
          <div className="ms-4 w-56 shrink-0">
            {projectsLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : projects.length > 0 ? (
              <Select
                value={projectId ?? undefined}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger aria-label={t("selectProject")}>
                  <SelectValue placeholder={t("selectProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.key} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>

        {/* Workflow editor or empty state */}
        <div className="flex-1">
          {projectsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Skeleton className="h-64 w-full max-w-2xl rounded-lg" />
            </div>
          ) : !projectId ? (
            <EmptyState
              icon={<Inbox className="size-12" />}
              title={t("noProjects")}
              description={t("noProjectsDescription")}
            />
          ) : (
            <WorkflowEditor
              projectId={projectId}
              className="h-[calc(100vh-12rem)]"
            />
          )}
        </div>
      </div>
    </>
  );
}

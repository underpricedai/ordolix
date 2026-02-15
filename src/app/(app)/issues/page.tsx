"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, Plus, Search } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { IssueList } from "@/modules/issues/components/IssueList";
import { IssueCreateDialog } from "@/modules/issues/components/IssueCreateDialog";
import { IssueFilters, type ActiveFilters } from "@/modules/issues/components/IssueFilters";
import { trpc } from "@/shared/lib/trpc";

/**
 * Issue list page with table view, search, filters, and create dialog.
 *
 * @description Fetches available projects and renders issues for the selected
 * project. Composes IssueList, IssueCreateDialog, and IssueFilters components
 * into a full-page layout with search, filter bar, sortable table, and pagination.
 */
export default function IssuesPage() {
  const t = useTranslations("issues");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [filters, setFilters] = useState<ActiveFilters>({
    status: [],
    assignee: [],
    priority: [],
    type: [],
    label: [],
  });

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = trpc.project.list.useQuery({ limit: 50 });

  const projects = projectsData?.items ?? [];
  const currentProjectId = selectedProjectId ?? projects[0]?.id;

  const handleCreateClick = useCallback(() => {
    setCreateOpen(true);
  }, []);

  if (projectsLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("issues") }]} />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (projectsError) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("issues") }]} />
        <div className="flex-1 p-6">
          <EmptyState
            icon={<FolderOpen className="size-12" />}
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
        <AppHeader breadcrumbs={[{ label: tn("issues") }]} />
        <div className="flex-1 p-6">
          <EmptyState
            icon={<FolderOpen className="size-12" />}
            title="No projects yet"
            description="Create a project first to start tracking issues."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("issues") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {tn("issues")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createIssue")}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        {/* Filters */}
        <IssueFilters filters={filters} onFiltersChange={setFilters} />

        {/* Issues table */}
        {currentProjectId && (
          <IssueList
            projectId={currentProjectId}
            searchQuery={searchQuery}
            statusId={filters.status[0]}
            assigneeId={filters.assignee[0]}
            issueTypeId={filters.type[0]}
            onCreateClick={handleCreateClick}
          />
        )}
      </div>

      {/* Create issue dialog */}
      {currentProjectId && (
        <IssueCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={currentProjectId}
        />
      )}
    </>
  );
}

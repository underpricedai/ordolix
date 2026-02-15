"use client";

import { useState, useCallback, useMemo } from "react";
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
import { SavedFilterBar } from "@/modules/search/components/SavedFilterBar";
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

  // Fetch filter options
  const { data: issueTypes } = trpc.issue.listIssueTypes.useQuery(
    undefined,
    { enabled: !projectsLoading },
  );
  const { data: priorities } = trpc.issue.listPriorities.useQuery(
    undefined,
    { enabled: !projectsLoading },
  );
  const { data: statuses } = trpc.issue.listStatuses.useQuery(
    { projectId: currentProjectId! },
    { enabled: !!currentProjectId },
  );
  const { data: usersData } = trpc.user.listUsers.useQuery(
    { limit: 200 },
    { enabled: !projectsLoading },
  );

  const statusOptions = useMemo(
    () => (statuses ?? []).map((s: { id: string; name: string }) => ({ id: s.id, label: s.name })),
    [statuses],
  );
  const typeOptions = useMemo(
    () => (issueTypes ?? []).map((t: { id: string; name: string }) => ({ id: t.id, label: t.name })),
    [issueTypes],
  );
  const priorityOptions = useMemo(
    () => (priorities ?? []).map((p: { id: string; name: string }) => ({ id: p.id, label: p.name })),
    [priorities],
  );
  const assigneeOptions = useMemo(
    () => (usersData?.items ?? []).map((m: { user: { id: string; name: string | null; email: string } }) => ({
      id: m.user.id,
      label: m.user.name ?? m.user.email,
    })),
    [usersData],
  );

  /** Build an AQL-like query string from active filters for saving */
  const currentFilterQuery = useMemo(() => {
    const parts: string[] = [];
    if (searchQuery) parts.push(`text ~ "${searchQuery}"`);
    if (filters.status.length > 0) parts.push(`status IN (${filters.status.join(",")})`);
    if (filters.type.length > 0) parts.push(`type IN (${filters.type.join(",")})`);
    if (filters.priority.length > 0) parts.push(`priority IN (${filters.priority.join(",")})`);
    if (filters.assignee.length > 0) parts.push(`assignee IN (${filters.assignee.join(",")})`);
    return parts.join(" AND ");
  }, [searchQuery, filters]);

  /** Load a saved filter query back into active filters */
  const handleLoadFilter = useCallback((query: string) => {
    setSearchQuery("");
    const newFilters: ActiveFilters = { status: [], assignee: [], priority: [], type: [], label: [] };

    const textMatch = query.match(/text ~ "([^"]+)"/);
    if (textMatch) setSearchQuery(textMatch[1]!);

    const extractIds = (field: string) => {
      const re = new RegExp(`${field} IN \\(([^)]+)\\)`);
      const match = query.match(re);
      return match ? match[1]!.split(",").map((s) => s.trim()) : [];
    };

    newFilters.status = extractIds("status");
    newFilters.type = extractIds("type");
    newFilters.priority = extractIds("priority");
    newFilters.assignee = extractIds("assignee");
    setFilters(newFilters);
  }, []);

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

        {/* Saved Filters */}
        <SavedFilterBar
          currentQuery={currentFilterQuery}
          onLoadFilter={handleLoadFilter}
        />

        {/* Filters */}
        <IssueFilters
          filters={filters}
          onFiltersChange={setFilters}
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          priorityOptions={priorityOptions}
          assigneeOptions={assigneeOptions}
        />

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

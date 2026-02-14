"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { IssueList } from "@/modules/issues/components/IssueList";
import { IssueCreateDialog } from "@/modules/issues/components/IssueCreateDialog";
import { IssueFilters, type ActiveFilters } from "@/modules/issues/components/IssueFilters";

/**
 * Issue list page with table view, search, filters, and create dialog.
 *
 * @description Composes IssueList, IssueCreateDialog, and IssueFilters components
 * into a full-page layout. Provides search input, filter bar, sortable table
 * with pagination, and a create issue dialog.
 */
export default function IssuesPage() {
  const t = useTranslations("issues");
  const tn = useTranslations("nav");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>({
    status: [],
    assignee: [],
    priority: [],
    type: [],
    label: [],
  });

  const handleCreateClick = useCallback(() => {
    setCreateOpen(true);
  }, []);

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("issues") }]} />
      <div className="flex-1 space-y-4 p-6">
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
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createIssue")}
          </Button>
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
        <IssueList
          projectId="default"
          searchQuery={searchQuery}
          statusId={filters.status[0]}
          assigneeId={filters.assignee[0]}
          issueTypeId={filters.type[0]}
          onCreateClick={handleCreateClick}
        />
      </div>

      {/* Create issue dialog */}
      <IssueCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId="default"
      />
    </>
  );
}

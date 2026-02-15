"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Plus, Star, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

interface SavedFilterBarProps {
  /** Current AQL query or structured filter representation */
  currentQuery: string;
  /** Callback when a saved filter is loaded */
  onLoadFilter: (query: string) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * SavedFilterBar provides save, load, and manage functionality for filters.
 *
 * @description Displays a horizontal bar of saved filters that can be clicked
 * to load. Includes a "Save" button to save the current filter state and a
 * dropdown menu for each filter with edit/delete options.
 */
export function SavedFilterBar({
  currentQuery,
  onLoadFilter,
  className,
}: SavedFilterBarProps) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: filters } = trpc.search.listFilters.useQuery(
    { includeShared: true },
  );

  const saveFilter = trpc.search.saveFilter.useMutation({
    onSuccess: () => {
      utils.search.listFilters.invalidate();
      setSaveDialogOpen(false);
      setFilterName("");
      setIsShared(false);
    },
  });

  const deleteFilter = trpc.search.deleteFilter.useMutation({
    onSuccess: () => {
      utils.search.listFilters.invalidate();
      if (activeFilterId) setActiveFilterId(null);
    },
  });

  const handleSave = useCallback(() => {
    if (!filterName.trim() || !currentQuery.trim()) return;
    saveFilter.mutate({
      name: filterName.trim(),
      query: currentQuery,
      isShared,
    });
  }, [filterName, currentQuery, isShared, saveFilter]);

  const handleLoad = useCallback(
    (filter: { id: string; aql: string }) => {
      setActiveFilterId(filter.id);
      onLoadFilter(filter.aql);
    },
    [onLoadFilter],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteFilter.mutate({ id });
    },
    [deleteFilter],
  );

  const filterList = filters ?? [];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Bookmark className="size-4" aria-hidden="true" />
        <span>{t("savedFilters")}</span>
      </div>

      <div className="flex max-w-[600px] items-center gap-1.5 overflow-x-auto">
        {filterList.map((filter: { id: string; name: string; aql: string; isStarred: boolean; sharedWith: unknown }) => (
          <div key={filter.id} className="flex shrink-0 items-center">
            <Button
              variant={activeFilterId === filter.id ? "secondary" : "outline"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => handleLoad(filter)}
            >
              {filter.isStarred && (
                <Star className="size-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
              )}
              {filter.name}
              {Array.isArray(filter.sharedWith) && filter.sharedWith.length > 0 && (
                <Share2 className="size-3 text-muted-foreground" aria-hidden="true" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0"
                  aria-label={`${tc("actions")} ${filter.name}`}
                >
                  <MoreHorizontal className="size-3" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => handleDelete(filter.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
                  {tc("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {currentQuery.trim() && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() => setSaveDialogOpen(true)}
        >
          <Plus className="size-3" aria-hidden="true" />
          {t("saveFilter")}
        </Button>
      )}

      {/* Save filter dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("saveFilter")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="filter-name" className="text-sm font-medium">
                {t("filterName")}
              </label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder={t("filterNamePlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">{t("filterQuery")}</p>
              <p className="mt-1 font-mono text-sm">{currentQuery}</p>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(checked === true)}
              />
              <span className="text-sm">{t("shareWithTeam")}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!filterName.trim() || saveFilter.isPending}
            >
              {saveFilter.isPending ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

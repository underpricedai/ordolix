/**
 * AQL search page.
 *
 * @description Provides an advanced search interface with AQL query input,
 * filter chips for project/type/status/assignee, saved filters sidebar,
 * recent searches history, and a results table with issue details.
 *
 * @module search-page
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bookmark,
  Clock,
  Inbox,
  SlidersHorizontal,
  X,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Shape of a search result row.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchResult = any;

/**
 * Active filter state for the filter chips.
 */
interface ActiveFilters {
  project: string;
  type: string;
  status: string;
  assignee: string;
}

const EMPTY_FILTERS: ActiveFilters = {
  project: "",
  type: "",
  status: "",
  assignee: "",
};

/** Maximum number of recent searches to retain. */
const MAX_RECENT_SEARCHES = 5;

/**
 * Maps a priority name to a PriorityLevel.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = [
    "highest",
    "high",
    "medium",
    "low",
    "lowest",
  ];
  return validLevels.includes(normalized) ? normalized : "medium";
}

export default function SearchPage() {
  const t = useTranslations("search");
  const tn = useTranslations("nav");
  const ti = useTranslations("issues");

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Sync from URL when query param changes (e.g., from header search bar)
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q && q !== submittedQuery) {
      setQuery(q);
      setSubmittedQuery(q);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // tRPC query for search results — uses the dedicated search router
  const { data: searchData, isLoading } = trpc.search.search.useQuery(
    { query: submittedQuery },
    { enabled: submittedQuery.length > 0 },
  );

  const results: SearchResult[] = useMemo(
    () => (searchData as unknown as { items?: SearchResult[] })?.items ?? [],
    [searchData],
  );

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((v) => v.length > 0).length,
    [filters],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      setSubmittedQuery(trimmed);

      // Add to recent searches (dedup, cap at max)
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      });
    },
    [query],
  );

  const handleRecentSearchClick = useCallback((search: string) => {
    setQuery(search);
    setSubmittedQuery(search);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof ActiveFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("search") }]} />
      <div className="flex flex-1">
        {/* Sidebar with saved filters and recent searches */}
        <aside className="hidden w-64 shrink-0 border-r p-4 lg:block">
          <div className="space-y-6">
            {/* Saved filters */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bookmark className="size-4" aria-hidden="true" />
                {t("savedFilters")}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("noSavedFilters")}
              </p>
            </div>

            <Separator />

            {/* Recent searches */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="size-4" aria-hidden="true" />
                {t("recentSearches")}
              </h3>
              {recentSearches.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("noRecentSearches")}
                </p>
              ) : (
                <ul className="mt-2 space-y-1" role="list">
                  {recentSearches.map((search) => (
                    <li key={search}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        <Clock className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{search}</span>
                        <ArrowRight className="ms-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* AQL syntax help */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HelpCircle className="size-4" aria-hidden="true" />
                {t("aqlSyntaxHelp")}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {t("aqlHelpDescription")}
              </p>
              <div className="mt-3 space-y-1.5">
                <code className="block rounded bg-muted px-2 py-1 text-[10px] font-mono text-foreground">
                  status = &quot;In Progress&quot;
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-[10px] font-mono text-foreground">
                  priority IN (&quot;High&quot;, &quot;Critical&quot;)
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-[10px] font-mono text-foreground">
                  assignee IS EMPTY
                </code>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          {/* Search input */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder={t("inputPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-11 pr-4 text-base"
                aria-label={t("inputPlaceholder")}
              />
            </div>
          </form>

          {/* Filter chips bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-pressed={showFilters}
            >
              <SlidersHorizontal className="mr-1.5 size-3.5" aria-hidden="true" />
              {t("filters")}
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ms-1.5 size-5 justify-center rounded-full p-0 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Active filter badges */}
            {filters.project && (
              <FilterChip
                label={`${t("filterByProject")}: ${filters.project}`}
                onRemove={() => handleFilterChange("project", "")}
              />
            )}
            {filters.type && (
              <FilterChip
                label={`${t("filterByType")}: ${filters.type}`}
                onRemove={() => handleFilterChange("type", "")}
              />
            )}
            {filters.status && (
              <FilterChip
                label={`${t("filterByStatus")}: ${filters.status}`}
                onRemove={() => handleFilterChange("status", "")}
              />
            )}
            {filters.assignee && (
              <FilterChip
                label={`${t("filterByAssignee")}: ${filters.assignee}`}
                onRemove={() => handleFilterChange("assignee", "")}
              />
            )}

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearFilters}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>

          {/* Filter dropdowns */}
          {showFilters && (
            <Card>
              <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filterByProject")}
                  </label>
                  <Select
                    value={filters.project}
                    onValueChange={(v) =>
                      handleFilterChange("project", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label={t("filterByProject")}>
                      <SelectValue placeholder={t("allProjects")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("allProjects")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filterByType")}
                  </label>
                  <Select
                    value={filters.type}
                    onValueChange={(v) =>
                      handleFilterChange("type", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label={t("filterByType")}>
                      <SelectValue placeholder={t("allTypes")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("allTypes")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filterByStatus")}
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(v) =>
                      handleFilterChange("status", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label={t("filterByStatus")}>
                      <SelectValue placeholder={t("allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("allStatuses")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filterByAssignee")}
                  </label>
                  <Select
                    value={filters.assignee}
                    onValueChange={(v) =>
                      handleFilterChange("assignee", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label={t("filterByAssignee")}>
                      <SelectValue placeholder={t("allAssignees")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("allAssignees")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search tip (when no query submitted) */}
          {!submittedQuery && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Search className="mx-auto size-12 text-muted-foreground/40" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  {t("title")}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("searchTip")}
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {submittedQuery && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  {t("results")}
                  {!isLoading && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {t("resultCount", { count: results.length })}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm">
                          <SlidersHorizontal
                            className="mr-1.5 size-3.5"
                            aria-hidden="true"
                          />
                          {t("customizeColumns")}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("customizeColumns")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <SearchResultsSkeleton />
                ) : results.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="size-12" />}
                    title={t("noResults")}
                    description={t("noResultsDescription")}
                  />
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">
                            {ti("columns.key")}
                          </TableHead>
                          <TableHead>{ti("columns.summary")}</TableHead>
                          <TableHead className="w-[140px]">
                            {ti("columns.status")}
                          </TableHead>
                          <TableHead className="w-[100px]">
                            {ti("columns.priority")}
                          </TableHead>
                          <TableHead className="w-[140px]">
                            {ti("columns.assignee")}
                          </TableHead>
                          <TableHead className="w-[120px]">
                            {ti("columns.updated")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result: SearchResult) => (
                          <TableRow key={result.id}>
                            <TableCell>
                              <Link
                                href={`/issues/${result.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {result.key}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate">
                              {result.summary}
                            </TableCell>
                            <TableCell>
                              {result.status && (
                                <StatusBadge
                                  name={result.status.name}
                                  category={
                                    result.status.category as StatusCategory
                                  }
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {result.priority && (
                                <PriorityIcon
                                  priority={toPriorityLevel(
                                    result.priority.name,
                                  )}
                                  showLabel
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {result.assignee?.name ?? ti("unassigned")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {result.updatedAt
                                ? new Intl.DateTimeFormat("en", {
                                    dateStyle: "medium",
                                  }).format(new Date(result.updatedAt))
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * FilterChip renders a removable badge for an active filter.
 */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pe-1 text-xs font-normal"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ms-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </Badge>
  );
}

/**
 * Skeleton loading state for search results.
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-0 rounded-md border">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            i < 5 && "border-b",
          )}
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

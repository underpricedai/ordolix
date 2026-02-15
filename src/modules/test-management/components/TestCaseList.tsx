"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Play,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
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

/**
 * Test suite node in the tree structure.
 */
interface TestSuite {
  id: string;
  name: string;
  testCases: TestCaseRow[];
}

/**
 * Test case row data.
 */
interface TestCaseRow {
  id: string;
  key: string;
  title: string;
  status: "draft" | "ready" | "deprecated";
  priority: "low" | "medium" | "high" | "critical";
  lastRunResult?: "passed" | "failed" | "blocked" | "skipped" | null;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  deprecated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const resultColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  blocked: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  skipped: "bg-muted text-muted-foreground",
};

interface TestCaseListProps {
  /** Test suite ID to filter by, or undefined for all */
  testSuiteId?: string;
  /** Callback when a test case is selected for editing */
  onSelectTestCase?: (id: string) => void;
}

/**
 * TestCaseList renders a tree-view test case browser organized by test suite.
 *
 * @description Displays test cases in a collapsible tree structure grouped by
 * test suite. Columns include ID, title, status, priority, and last run result.
 * Supports bulk selection for actions like run and assign. Includes search and
 * filter capabilities.
 *
 * @param props - TestCaseListProps
 * @returns A test case browser component
 *
 * @example
 * <TestCaseList onSelectTestCase={(id) => router.push(`/test-management/${id}`)} />
 */
export function TestCaseList({
  testSuiteId,
  onSelectTestCase,
}: TestCaseListProps) {
  const t = useTranslations("testManagement");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(
    new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // tRPC query for test cases
  const { data, isLoading, error } = trpc.testManagement.listCases.useQuery(
    {
      testSuiteId: testSuiteId ?? "",
      priority: filterPriority !== "all" ? (filterPriority as "low" | "medium" | "high" | "critical") : undefined,
      status: filterStatus !== "all" ? (filterStatus as "draft" | "ready" | "deprecated") : undefined,
    },
    { enabled: true },
  );

  // Parse into suite structure
  const suites: TestSuite[] = useMemo(() => {
    if (!data) return [];
    return (data as { suites?: TestSuite[] }).suites ?? [];
  }, [data]);

  // Apply search filter
  const filteredSuites = useMemo(() => {
    if (!searchQuery) return suites;
    const query = searchQuery.toLowerCase();
    return suites
      .map((suite) => ({
        ...suite,
        testCases: suite.testCases.filter(
          (tc) =>
            tc.title.toLowerCase().includes(query) ||
            tc.key.toLowerCase().includes(query),
        ),
      }))
      .filter((suite) => suite.testCases.length > 0);
  }, [suites, searchQuery]);

  const totalCases = filteredSuites.reduce(
    (sum, s) => sum + s.testCases.length,
    0,
  );

  const toggleSuite = (id: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === totalCases) {
      setSelectedIds(new Set());
    } else {
      const all = new Set<string>();
      filteredSuites.forEach((s) => s.testCases.forEach((tc) => all.add(tc.id)));
      setSelectedIds(all);
    }
  };

  if (isLoading) {
    return <TestCaseListSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-12" />}
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

  if (filteredSuites.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-12" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchTestCases")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchTestCases")}
          />
        </div>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]" aria-label={t("filterPriority")}>
            <SelectValue placeholder={t("priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="critical">{t("critical")}</SelectItem>
            <SelectItem value="high">{t("high")}</SelectItem>
            <SelectItem value="medium">{t("medium")}</SelectItem>
            <SelectItem value="low">{t("low")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]" aria-label={t("filterStatus")}>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="draft">{t("draft")}</SelectItem>
            <SelectItem value="ready">{t("ready")}</SelectItem>
            <SelectItem value="deprecated">{t("deprecated")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {t("selected", { count: selectedIds.size })}
          </span>
          <Button variant="outline" size="sm">
            <Play className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("runSelected")}
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("assign")}
          </Button>
        </div>
      )}

      {/* Test case tree */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === totalCases && totalCases > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label={t("selectAll")}
                />
              </TableHead>
              <TableHead className="w-[100px]">{t("id")}</TableHead>
              <TableHead>{t("titleColumn")}</TableHead>
              <TableHead className="w-[100px]">{t("status")}</TableHead>
              <TableHead className="w-[100px]">{t("priority")}</TableHead>
              <TableHead className="w-[120px]">{t("lastRun")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuites.map((suite) => (
              <TestSuiteNode
                key={suite.id}
                suite={suite}
                expanded={expandedSuites.has(suite.id)}
                onToggle={() => toggleSuite(suite.id)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectTestCase={onSelectTestCase}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Renders a collapsible test suite node with its child test cases.
 */
function TestSuiteNode({
  suite,
  expanded,
  onToggle,
  selectedIds,
  onToggleSelect,
  onSelectTestCase,
}: {
  suite: TestSuite;
  expanded: boolean;
  onToggle: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectTestCase?: (id: string) => void;
}) {
  const t = useTranslations("testManagement");

  return (
    <>
      {/* Suite header row */}
      <TableRow
        className="cursor-pointer bg-muted/30 hover:bg-muted/50"
        onClick={onToggle}
        role="row"
        aria-expanded={expanded}
      >
        <TableCell colSpan={6}>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{suite.name}</span>
            <Badge variant="secondary" className="text-xs">
              {suite.testCases.length}
            </Badge>
          </div>
        </TableCell>
      </TableRow>

      {/* Test case rows */}
      {expanded &&
        (suite.testCases ?? []).map((tc) => (
          <TableRow
            key={tc.id}
            className="cursor-pointer"
            onClick={() => onSelectTestCase?.(tc.id)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(tc.id)}
                onCheckedChange={() => onToggleSelect(tc.id)}
                aria-label={`${t("select")} ${tc.key}`}
              />
            </TableCell>
            <TableCell className="font-medium text-primary">
              {tc.key}
            </TableCell>
            <TableCell className="max-w-[300px] truncate">
              {tc.title}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs border-transparent",
                  statusColors[tc.status],
                )}
              >
                {tc.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs border-transparent",
                  priorityColors[tc.priority],
                )}
              >
                {tc.priority}
              </Badge>
            </TableCell>
            <TableCell>
              {tc.lastRunResult ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border-transparent",
                    resultColors[tc.lastRunResult],
                  )}
                >
                  {t(tc.lastRunResult)}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("untested")}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}

/**
 * Skeleton loading state for TestCaseList.
 */
function TestCaseListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[130px]" />
        <Skeleton className="h-9 w-[130px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Skeleton className="size-4" /></TableHead>
              <TableHead className="w-[100px]"><Skeleton className="h-4 w-8" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead className="w-[100px]"><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead className="w-[100px]"><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead className="w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

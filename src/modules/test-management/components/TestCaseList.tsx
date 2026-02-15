"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  FlaskConical,
  Play,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
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
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
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

/**
 * Flattened test case row for ResponsiveTable rendering.
 */
interface FlatTestCaseRow extends TestCaseRow {
  suiteName: string;
  suiteId: string;
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

  // Flatten suites into a flat list for ResponsiveTable
  const flatRows: FlatTestCaseRow[] = useMemo(() => {
    return filteredSuites.flatMap((suite) =>
      suite.testCases.map((tc) => ({
        ...tc,
        suiteName: suite.name,
        suiteId: suite.id,
      })),
    );
  }, [filteredSuites]);

  const totalCases = flatRows.length;

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
      flatRows.forEach((row) => all.add(row.id));
      setSelectedIds(all);
    }
  };

  const columns: ResponsiveColumnDef<FlatTestCaseRow>[] = [
    {
      key: "name",
      header: t("titleColumn"),
      priority: 1,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.has(row.id)}
            onCheckedChange={() => toggleSelect(row.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${t("select")} ${row.key}`}
          />
          <span className="font-medium text-primary">{row.key}</span>
          <span className="max-w-[300px] truncate">{row.title}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: t("status"),
      priority: 2,
      className: "w-[100px]",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-xs border-transparent", statusColors[row.status])}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: t("priority"),
      priority: 3,
      className: "w-[100px]",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-xs border-transparent", priorityColors[row.priority])}
        >
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "suite",
      header: t("testSuite") ?? "Suite",
      priority: 4,
      className: "w-[140px]",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <FlaskConical className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm">{row.suiteName}</span>
        </div>
      ),
    },
    {
      key: "lastRun",
      header: t("lastRun"),
      priority: 5,
      className: "w-[120px]",
      cell: (row) =>
        row.lastRunResult ? (
          <Badge
            variant="outline"
            className={cn(
              "text-xs border-transparent",
              resultColors[row.lastRunResult],
            )}
          >
            {t(row.lastRunResult)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("untested")}</span>
        ),
    },
  ];

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

      {/* Test case table */}
      <div className="rounded-md border">
        <ResponsiveTable<FlatTestCaseRow>
          columns={columns}
          data={flatRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => onSelectTestCase?.(row.id)}
          emptyMessage={t("emptyDescription")}
          mobileCard={(row) => (
            <Card
              className="p-3"
              onClick={() => onSelectTestCase?.(row.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={() => toggleSelect(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${t("select")} ${row.key}`}
                    />
                    <span className="text-sm font-medium text-primary">{row.key}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{row.title}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FlaskConical className="size-3" aria-hidden="true" />
                    {row.suiteName}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={cn("text-xs border-transparent", statusColors[row.status])}
                  >
                    {row.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-xs border-transparent", priorityColors[row.priority])}
                  >
                    {row.priority}
                  </Badge>
                </div>
              </div>
            </Card>
          )}
        />
      </div>
    </div>
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

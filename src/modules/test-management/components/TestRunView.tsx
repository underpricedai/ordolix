"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  SkipForward,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Status of an individual test result within a run.
 */
type TestResultStatus = "passed" | "failed" | "blocked" | "skipped";

/**
 * A test case entry within a test run.
 */
interface TestRunCase {
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  status: TestResultStatus | null;
  actualResult: string;
}

interface TestRunViewProps {
  /** The test run ID to display and execute */
  testRunId: string;
}

const statusConfig: Record<
  TestResultStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  passed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  blocked: {
    icon: ShieldAlert,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  skipped: {
    icon: SkipForward,
    color: "text-muted-foreground",
    bgColor: "bg-muted text-muted-foreground",
  },
};

/**
 * TestRunView renders the test run execution interface.
 *
 * @description Displays a test run header with name, progress bar, and dates.
 * Lists all test cases within the run with pass/fail/skip/blocked action buttons.
 * Each case includes an actual result textarea and an attachment upload placeholder.
 *
 * @param props - TestRunViewProps
 * @returns The test run execution view
 *
 * @example
 * <TestRunView testRunId="run-123" />
 */
export function TestRunView({ testRunId }: TestRunViewProps) {
  const t = useTranslations("testManagement");
  const tc = useTranslations("common");

  // Local state for test results (optimistic updates)
  const [results, setResults] = useState<Map<string, { status: TestResultStatus | null; actualResult: string }>>(
    new Map(),
  );

  // tRPC query for test run data
  const { data: runData, isLoading, error } = trpc.testManagement.getRun.useQuery(
    { id: testRunId },
    { enabled: Boolean(testRunId) },
  );

  // tRPC mutation for recording results
  const recordResult = trpc.testManagement.recordResult.useMutation();

  // Parse run data
  const run = runData as unknown as {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    testCases: TestRunCase[];
  } | null;

  const cases: TestRunCase[] = run?.testCases ?? [];

  // Compute progress
  const totalCases = cases.length;
  const completedCases = cases.filter((c) => {
    const local = results.get(c.testCaseId);
    return local?.status ?? c.status;
  }).length;
  const progressPercent = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

  // Count by status
  const statusCounts = cases.reduce(
    (acc, c) => {
      const local = results.get(c.testCaseId);
      const status = local?.status ?? c.status;
      if (status) {
        acc[status] = (acc[status] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleSetStatus = useCallback(
    async (testCaseId: string, status: TestResultStatus) => {
      // Optimistic update
      setResults((prev) => {
        const next = new Map(prev);
        const existing = next.get(testCaseId) ?? { status: null, actualResult: "" };
        next.set(testCaseId, { ...existing, status });
        return next;
      });

      // Persist via tRPC
      await recordResult.mutateAsync({
        testRunId,
        testCaseId,
        status,
        comment: results.get(testCaseId)?.actualResult || undefined,
      });
    },
    [testRunId, results, recordResult],
  );

  const handleActualResultChange = useCallback(
    (testCaseId: string, value: string) => {
      setResults((prev) => {
        const next = new Map(prev);
        const existing = next.get(testCaseId) ?? { status: null, actualResult: "" };
        next.set(testCaseId, { ...existing, actualResult: value });
        return next;
      });
    },
    [],
  );

  if (isLoading) {
    return <TestRunSkeleton />;
  }

  if (error || !run) {
    return (
      <EmptyState
        icon={<FileText className="size-12" />}
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

  return (
    <div className="space-y-6">
      {/* Run header */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {run.name}
            </h2>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {run.startedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t("startedAt")}:{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(run.startedAt))}
                </span>
              )}
              {run.completedAt && (
                <span>
                  {t("completedAt")}:{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(run.completedAt))}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {run.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("progress")}: {completedCases}/{totalCases}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} aria-label={t("progress")} />
        </div>

        {/* Status summary */}
        <div className="flex flex-wrap gap-3">
          {(["passed", "failed", "blocked", "skipped"] as const).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <Badge
                key={status}
                variant="outline"
                className={cn("border-transparent", config.bgColor)}
              >
                <Icon className="mr-1 size-3.5" aria-hidden="true" />
                {t(status)}: {statusCounts[status] ?? 0}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Test case list */}
      <div className="space-y-4" role="list" aria-label={t("testCases")}>
        {cases.map((testCase) => {
          const local = results.get(testCase.testCaseId);
          const currentStatus = local?.status ?? testCase.status;
          const actualResult = local?.actualResult ?? testCase.actualResult ?? "";

          return (
            <Card key={testCase.testCaseId} role="listitem">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    <span className="font-medium text-primary">
                      {testCase.testCaseKey}
                    </span>{" "}
                    <span className="text-foreground">
                      {testCase.testCaseTitle}
                    </span>
                  </CardTitle>
                  {currentStatus && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-xs",
                        statusConfig[currentStatus].bgColor,
                      )}
                    >
                      {t(currentStatus)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Result buttons */}
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label={t("setResult")}
                >
                  {(["passed", "failed", "blocked", "skipped"] as const).map(
                    (status) => {
                      const config = statusConfig[status];
                      const Icon = config.icon;
                      const isActive = currentStatus === status;
                      return (
                        <Button
                          key={status}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            isActive && config.bgColor,
                            isActive && "border-transparent",
                          )}
                          onClick={() =>
                            handleSetStatus(testCase.testCaseId, status)
                          }
                          aria-pressed={isActive}
                          aria-label={t(status)}
                        >
                          <Icon
                            className="mr-1.5 size-3.5"
                            aria-hidden="true"
                          />
                          {t(status)}
                        </Button>
                      );
                    },
                  )}
                </div>

                {/* Actual result textarea */}
                <div className="grid gap-2">
                  <Label
                    htmlFor={`actual-result-${testCase.testCaseId}`}
                    className="text-xs"
                  >
                    {t("actualResult")}
                  </Label>
                  <Textarea
                    id={`actual-result-${testCase.testCaseId}`}
                    value={actualResult}
                    onChange={(e) =>
                      handleActualResultChange(
                        testCase.testCaseId,
                        e.target.value,
                      )
                    }
                    placeholder={t("actualResultPlaceholder")}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Attachment upload placeholder */}
                <Button variant="outline" size="sm" disabled>
                  <Upload className="mr-1.5 size-3.5" aria-hidden="true" />
                  {t("attachFile")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for TestRunView.
 */
function TestRunSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

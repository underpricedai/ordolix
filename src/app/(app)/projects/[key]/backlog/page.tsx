/**
 * Project-scoped backlog page.
 *
 * @description Shows backlog issues for the project -- issues not assigned
 * to a sprint. Displays issues in a filterable table layout with priority,
 * status, assignee, and estimation columns.
 *
 * @module project-backlog-page
 */
"use client";

import { use, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, ListTodo } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BacklogIssue = any;

export default function ProjectBacklogPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.backlog");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("backlog") },
  ];

  // First resolve project to get its ID
  const { data: project, isLoading: projectLoading } =
    trpc.project.getByKey.useQuery({ key });

  const projectId = project?.id;

  // Fetch issues for this project using the resolved projectId
  const {
    data: issuesData,
    isLoading: issuesLoading,
    error,
  } = trpc.issue.list.useQuery(
    {
      projectId: projectId!,
      search: searchQuery || undefined,
    },
    { enabled: !!projectId },
  );

  const isLoading = projectLoading || issuesLoading;
  const issuesResult = issuesData as { items?: BacklogIssue[] } | undefined;
  const issues: BacklogIssue[] = issuesResult?.items ?? [];

  const handleCreateIssue = useCallback(() => {
    // In production, this would open a create issue dialog
  }, []);

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Button onClick={handleCreateIssue}>
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

        {/* Backlog table */}
        {error ? (
          <EmptyState
            icon={<ListTodo className="size-12" />}
            title={tc("error")}
            description={tc("retry")}
            action={
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {tc("retry")}
              </Button>
            }
          />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={<ListTodo className="size-12" />}
            title={t("noIssues")}
            description={t("noIssuesDescription")}
            action={
              <Button onClick={handleCreateIssue}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createIssue")}
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    {tc("details")}
                  </TableHead>
                  <TableHead>{t("summary") ?? "Summary"}</TableHead>
                  <TableHead className="w-[120px]">{t("status")}</TableHead>
                  <TableHead className="w-[100px]">{t("priority")}</TableHead>
                  <TableHead className="w-[140px]">{t("assignee")}</TableHead>
                  <TableHead className="w-[100px]">{t("estimate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue: BacklogIssue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {issue.key}
                      </span>
                    </TableCell>
                    <TableCell>{issue.summary}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{issue.status ?? "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.priority ?? "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {issue.assignee ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {issue.storyPoints ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Hint text */}
        {issues.length > 0 && (
          <p className="text-xs text-muted-foreground">{t("dragToSprint")}</p>
        )}
      </div>
    </>
  );
}

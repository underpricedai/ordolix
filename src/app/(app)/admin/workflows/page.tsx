/**
 * Admin workflow management page.
 *
 * @description Lists all workflow schemes with status counts, project
 * assignments, and actions for creating, copying, and editing workflows.
 *
 * @module admin-workflows
 */
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Plus,
  Copy,
  ExternalLink,
  Inbox,
  GitBranch,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowRow = any;

export default function AdminWorkflowsPage() {
  const t = useTranslations("admin.workflows");
  const tc = useTranslations("common");

  // TODO: Replace with tRPC admin.listWorkflows query once admin router is implemented
  const isLoading = false;

  const workflows: WorkflowRow[] = [];

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t("createWorkflow")}
        </Button>
      </div>

      {/* Workflows list */}
      {isLoading ? (
        <WorkflowsSkeleton />
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noWorkflows")}
          description={t("noWorkflowsDescription")}
          action={
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createWorkflow")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow: WorkflowRow) => (
            <Card key={workflow.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <GitBranch
                      className="size-5 text-purple-600 dark:text-purple-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/workflows/${workflow.id}`}
                        className="hover:underline"
                      >
                        {workflow.name}
                      </Link>
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {t("statusCount", {
                          count: workflow._count?.workflowStatuses ?? 0,
                        })}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t("projectAssignments", {
                          count: workflow._count?.projects ?? 0,
                        })}
                      </Badge>
                      {workflow.isDefault && (
                        <Badge className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {workflow.createdAt
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(workflow.createdAt))
                      : ""}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={tc("actions")}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/workflows/${workflow.id}`}>
                          <ExternalLink className="mr-2 size-4" aria-hidden="true" />
                          {t("openEditor")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 size-4" aria-hidden="true" />
                        {t("copyWorkflow")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {workflow.description && (
                  <p className="text-sm text-muted-foreground">
                    {workflow.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the workflows list.
 */
function WorkflowsSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="size-8 rounded" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Zap,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutomationRule = any;

/** Maps trigger types to human-readable labels */
const TRIGGER_LABELS: Record<string, string> = {
  issue_created: "Issue Created",
  status_changed: "Status Changed",
  field_updated: "Field Updated",
  scheduled: "Scheduled",
};

interface AutomationRuleListProps {
  /** Optional project filter */
  projectId?: string;
  /** Called when Create Rule is clicked */
  onCreateRule?: () => void;
  /** Called when a rule is selected for editing */
  onEditRule?: (ruleId: string) => void;
}

/**
 * AutomationRuleList renders a table of automation rules with controls.
 *
 * @description Displays automation rules with columns for name, trigger event,
 * enabled toggle, last executed date, and execution count. Provides create,
 * edit, delete, and enable/disable actions.
 *
 * @param props - AutomationRuleListProps
 * @returns Automation rule list component
 */
export function AutomationRuleList({
  projectId,
  onCreateRule,
  onEditRule,
}: AutomationRuleListProps) {
  const t = useTranslations("automation");
  const tc = useTranslations("common");

  const {
    data: rulesData,
    isLoading,
    error,
  } = trpc.automation.list.useQuery(
    { projectId },
    { enabled: true },
  );

  const utils = trpc.useUtils();

  const updateMutation = trpc.automation.update.useMutation({
    onSuccess: () => {
      void utils.automation.list.invalidate();
    },
  });

  const deleteMutation = trpc.automation.delete.useMutation({
    onSuccess: () => {
      void utils.automation.list.invalidate();
    },
  });

  const handleToggle = useCallback(
    (rule: AutomationRule) => {
      updateMutation.mutate({
        id: rule.id,
        isActive: !rule.isActive,
      });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id });
    },
    [deleteMutation],
  );

  const rules: AutomationRule[] = rulesData ?? [];

  const columns: ResponsiveColumnDef<AutomationRule>[] = [
    {
      key: "name",
      header: t("ruleName"),
      priority: 1,
      cell: (rule) => (
        <div className="flex flex-col">
          <span className="font-medium">{rule.name}</span>
          {rule.description && (
            <span className="text-xs text-muted-foreground">{rule.description}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: t("enabled"),
      priority: 2,
      className: "w-[100px]",
      cell: (rule) => (
        <Switch
          checked={rule.isActive}
          onCheckedChange={() => handleToggle(rule)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Toggle ${rule.name}`}
        />
      ),
    },
    {
      key: "trigger",
      header: t("trigger"),
      priority: 3,
      className: "w-[160px]",
      cell: (rule) => (
        <Badge variant="secondary">
          <Zap className="mr-1 size-3" aria-hidden="true" />
          {TRIGGER_LABELS[rule.trigger?.type] ?? rule.trigger?.type ?? "-"}
        </Badge>
      ),
    },
    {
      key: "lastRun",
      header: t("lastExecuted"),
      priority: 4,
      className: "w-[160px]",
      cell: (rule) => (
        <span className="text-sm text-muted-foreground">
          {rule.lastExecutedAt
            ? new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(rule.lastExecutedAt))
            : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: tc("actions"),
      priority: 1,
      className: "w-[60px]",
      cell: (rule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${tc("actions")} for ${rule.name}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditRule?.(rule.id)}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />
              {t("editRule")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Play className="mr-2 size-4" aria-hidden="true" />
              Test Run
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(rule.id)}
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              {t("deleteRule")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) return <AutomationRuleListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<Zap className="size-12" />}
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {tc("itemCount", { count: rules.length })}
          </p>
        </div>
        <Button onClick={onCreateRule}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t("createRule")}
        </Button>
      </div>

      {/* Rules table */}
      {rules.length === 0 ? (
        <EmptyState
          icon={<Zap className="size-12" />}
          title={t("title")}
          description="No automation rules configured yet."
          action={
            <Button onClick={onCreateRule}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createRule")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable<AutomationRule>
            columns={columns}
            data={rules}
            rowKey={(rule) => rule.id}
            onRowClick={(rule) => onEditRule?.(rule.id)}
            mobileCard={(rule) => (
              <Card className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
                    )}
                    <div className="mt-1.5">
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="mr-1 size-3" aria-hidden="true" />
                        {TRIGGER_LABELS[rule.trigger?.type] ?? rule.trigger?.type ?? "-"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Toggle ${rule.name}`}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`${tc("actions")} for ${rule.name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditRule?.(rule.id)}>
                          <Pencil className="mr-2 size-4" aria-hidden="true" />
                          {t("editRule")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="mr-2 size-4" aria-hidden="true" />
                          Test Run
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden="true" />
                          {t("deleteRule")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            )}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the automation rule list.
 */
function AutomationRuleListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                <TableCell><Skeleton className="size-6" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

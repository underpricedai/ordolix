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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ruleName")}</TableHead>
                <TableHead className="w-[160px]">{t("trigger")}</TableHead>
                <TableHead className="w-[100px]">{t("enabled")}</TableHead>
                <TableHead className="w-[160px]">{t("lastExecuted")}</TableHead>
                <TableHead className="w-[100px]">{t("executions")}</TableHead>
                <TableHead className="w-[60px]">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: AutomationRule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.name}</span>
                      {rule.description && (
                        <span className="text-xs text-muted-foreground">
                          {rule.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Zap className="mr-1 size-3" aria-hidden="true" />
                      {TRIGGER_LABELS[rule.trigger?.type] ?? rule.trigger?.type ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      aria-label={`Toggle ${rule.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.lastExecutedAt
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(rule.lastExecutedAt))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.executionCount ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${tc("actions")} for ${rule.name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEditRule?.(rule.id)}
                        >
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

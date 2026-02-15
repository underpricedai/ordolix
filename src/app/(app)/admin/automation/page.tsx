/**
 * Admin automation rules management page.
 *
 * @description Lists all automation rules with trigger type, action count,
 * active/disabled status, and toggle controls.
 *
 * @module admin-automation
 */
"use client";

import { useTranslations } from "next-intl";
import {
  Plus,
  Inbox,
  Zap,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";

/**
 * Shape of an automation rule row returned from the tRPC query.
 */
interface AutomationRuleRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: { type: string; config?: Record<string, unknown> };
  actions: { type: string; config?: Record<string, unknown> }[];
  createdAt: Date | string;
}

export default function AdminAutomationPage() {
  const t = useTranslations("admin.automation");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.automation.list.useQuery({});

  const rules: AutomationRuleRow[] =
    ((data as { items?: AutomationRuleRow[] })?.items ??
      (data as AutomationRuleRow[] | undefined)) ??
    [];

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

  /**
   * Toggles the isActive state of a rule.
   */
  function handleToggleActive(rule: AutomationRuleRow) {
    updateMutation.mutate({ id: rule.id, isActive: !rule.isActive });
  }

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
          {t("createRule")}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Automation rules list */}
      {isLoading ? (
        <AutomationSkeleton />
      ) : !error && rules.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noRules")}
          description={t("noRulesDescription")}
          action={
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createRule")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Zap
                      className="size-5 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {t(`triggerTypes.${rule.trigger?.type}` as "triggerTypes.issue_created")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t("ruleCount", {
                          count: rule.actions?.length ?? 0,
                        })}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggleActive(rule)}
                    aria-label={
                      rule.isActive ? tc("disable") : tc("enable")
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={tc("actions")}
                      >
                        <MoreHorizontal
                          className="size-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil
                          className="mr-2 size-4"
                          aria-hidden="true"
                        />
                        {tc("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate({ id: rule.id })}
                      >
                        <Trash2
                          className="mr-2 size-4"
                          aria-hidden="true"
                        />
                        {tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              {rule.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the automation rules list.
 */
function AutomationSkeleton() {
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
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="size-8 rounded" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

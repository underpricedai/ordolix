"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Code2,
  Inbox,
  Search,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
 * Script row data from the API.
 */
interface ScriptRow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  isEnabled: boolean;
  updatedAt: string;
}

const triggerTypeLabels: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  issue_created: "Issue Created",
  issue_updated: "Issue Updated",
  transition: "Transition",
  post_function: "Post Function",
};

const triggerTypeBadgeColors: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  issue_created: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  issue_updated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  transition: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  post_function: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

interface ScriptListProps {
  /** Callback when a script row is selected for editing */
  onSelectScript?: (id: string) => void;
}

/**
 * ScriptList renders the script library table with search and filters.
 *
 * @description Displays scripts in a table with name, type (automation/listener/
 * post-function), enabled status, and last modified columns. Supports filtering
 * by trigger type and search by name.
 *
 * @param props - ScriptListProps
 * @returns A script library table component
 *
 * @example
 * <ScriptList onSelectScript={(id) => setActiveScriptId(id)} />
 */
export function ScriptList({ onSelectScript }: ScriptListProps) {
  const t = useTranslations("scripts");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // tRPC query for scripts
  const {
    data: scriptsData,
    isLoading,
    error,
  } = trpc.script.list.useQuery(
    {
      triggerType: filterType !== "all" ? (filterType as "manual" | "scheduled" | "issue_created" | "issue_updated" | "transition" | "post_function") : undefined,
    },
    { enabled: true },
  );

  const scripts: ScriptRow[] =
    (scriptsData as { items?: ScriptRow[] })?.items ?? [];

  // Client-side search filter
  const filteredScripts = searchQuery
    ? scripts.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : scripts;

  if (isLoading) {
    return <ScriptListSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Inbox className="size-12" />}
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
      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchScripts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchScripts")}
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]" aria-label={t("filterType")}>
            <SelectValue placeholder={t("triggerType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="manual">{t("typeManual")}</SelectItem>
            <SelectItem value="scheduled">{t("typeScheduled")}</SelectItem>
            <SelectItem value="issue_created">{t("typeIssueCreated")}</SelectItem>
            <SelectItem value="issue_updated">{t("typeIssueUpdated")}</SelectItem>
            <SelectItem value="transition">{t("typeTransition")}</SelectItem>
            <SelectItem value="post_function">{t("typePostFunction")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scripts table */}
      {filteredScripts.length === 0 ? (
        <EmptyState
          icon={<Code2 className="size-12" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("scriptName")}</TableHead>
                <TableHead className="w-[160px]">{t("triggerType")}</TableHead>
                <TableHead className="w-[100px]">{t("status")}</TableHead>
                <TableHead className="w-[160px]">{t("lastModified")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScripts.map((script) => (
                <TableRow
                  key={script.id}
                  className="cursor-pointer"
                  onClick={() => onSelectScript?.(script.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Code2
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium">{script.name}</p>
                        {script.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {script.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-xs",
                        triggerTypeBadgeColors[script.triggerType] ?? triggerTypeBadgeColors.manual,
                      )}
                    >
                      {triggerTypeLabels[script.triggerType] ?? script.triggerType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-xs",
                        script.isEnabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {script.isEnabled ? t("enabled") : t("disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(new Date(script.updatedAt))}
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
 * Skeleton loading state for ScriptList.
 */
function ScriptListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-[160px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-48" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

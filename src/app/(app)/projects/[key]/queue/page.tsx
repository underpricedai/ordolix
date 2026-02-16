/**
 * Project-scoped queue page.
 *
 * @description Service desk queue for the project. Shows incoming requests
 * and issues with priority and SLA columns in a filterable table.
 * Includes a Create Queue dialog and an empty state when no queues exist.
 *
 * @module project-queue-page
 */
"use client";

import { use, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, Inbox, Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { ActionTooltip } from "@/shared/components/action-tooltip";
import { trpc } from "@/shared/lib/trpc";
import { IssueEditDialog } from "@/modules/issues/components/IssueEditDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueueItem = any;

export default function ProjectQueuePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.queue");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [editIssueId, setEditIssueId] = useState<string | null>(null);

  // Create queue dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueDescription, setNewQueueDescription] = useState("");
  const [filterIssueTypeId, setFilterIssueTypeId] = useState<string>("all");
  const [filterPriorityId, setFilterPriorityId] = useState<string>("all");

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("queue") },
  ];

  // First, resolve the project to get its ID
  const {
    data: project,
    isLoading: projectLoading,
  } = trpc.project.getByKey.useQuery({ key });

  const projectId = project?.id;

  // Fetch queues for this project
  const {
    data: queues,
    isLoading: queuesLoading,
    error: queuesError,
    refetch: refetchQueues,
  } = trpc.queue.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  // Fetch issue types and priorities for the filter in create dialog
  const { data: issueTypes } = trpc.admin.listIssueTypes.useQuery();
  const { data: priorities } = trpc.admin.listPriorities.useQuery();

  // Auto-select the first queue if none is selected
  const activeQueueId = selectedQueueId ?? queues?.[0]?.id;

  // Fetch issues for the selected queue
  const {
    data: queueIssues,
    isLoading: issuesLoading,
    error: issuesError,
  } = trpc.queue.getIssues.useQuery(
    { queueId: activeQueueId! },
    { enabled: !!activeQueueId },
  );

  // Create queue mutation
  const createQueueMutation = trpc.queue.create.useMutation({
    onSuccess: (newQueue) => {
      setCreateDialogOpen(false);
      resetCreateForm();
      setSelectedQueueId(newQueue.id);
      void refetchQueues();
    },
  });

  const resetCreateForm = useCallback(() => {
    setNewQueueName("");
    setNewQueueDescription("");
    setFilterIssueTypeId("all");
    setFilterPriorityId("all");
  }, []);

  const handleOpenCreateDialog = useCallback(() => {
    resetCreateForm();
    setCreateDialogOpen(true);
  }, [resetCreateForm]);

  const handleSubmitCreateQueue = useCallback(() => {
    if (!projectId || !newQueueName.trim()) return;

    const filter: Record<string, string[]> = {};
    if (filterIssueTypeId !== "all") {
      filter.issueTypeIds = [filterIssueTypeId];
    }
    if (filterPriorityId !== "all") {
      filter.priorityIds = [filterPriorityId];
    }

    createQueueMutation.mutate({
      projectId,
      name: newQueueName.trim(),
      description: newQueueDescription.trim() || undefined,
      filter,
    });
  }, [
    projectId,
    newQueueName,
    newQueueDescription,
    filterIssueTypeId,
    filterPriorityId,
    createQueueMutation,
  ]);

  const hasQueues = queues && queues.length > 0;
  const isLoading = projectLoading || queuesLoading || (hasQueues && issuesLoading);
  const error = queuesError ?? issuesError;
  const items: QueueItem[] = queueIssues?.issues ?? [];

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
                  {Array.from({ length: 6 }).map((_, i) => (
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
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <ActionTooltip content={t("createQueueTooltip")}>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createQueue")}
            </Button>
          </ActionTooltip>
        </div>

        {/* Empty state when no queues exist */}
        {!hasQueues ? (
          <EmptyState
            icon={<Inbox className="size-12" />}
            title={t("noQueues")}
            description={t("noQueuesDescription")}
            action={
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createQueue")}
              </Button>
            }
          />
        ) : (
          <>
            {/* Queue selector tabs */}
            {queues.length > 1 && (
              <div className="flex gap-2">
                {queues.map((q: { id: string; name: string }) => (
                  <Button
                    key={q.id}
                    variant={activeQueueId === q.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedQueueId(q.id)}
                  >
                    {q.name}
                  </Button>
                ))}
              </div>
            )}

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

            {/* Queue table */}
            {error ? (
              <EmptyState
                icon={<Inbox className="size-12" />}
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
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Inbox className="size-12" />}
                title={t("noRequests")}
                description={t("noRequestsDescription")}
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t("issueKey")}</TableHead>
                      <TableHead>{t("summary")}</TableHead>
                      <TableHead className="w-[140px]">{t("requester")}</TableHead>
                      <TableHead className="w-[100px]">{t("priority")}</TableHead>
                      <TableHead className="w-[120px]">{t("sla")}</TableHead>
                      <TableHead className="w-[100px]">{t("status")}</TableHead>
                      <TableHead className="w-[120px]">{t("created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: QueueItem) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditIssueId(item.id)}
                      >
                        <TableCell>
                          <span className="font-medium text-primary">
                            {item.key}
                          </span>
                        </TableCell>
                        <TableCell>{item.summary}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.assignee?.name ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.priority?.name ?? "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.slaStatus === "breached"
                                ? "destructive"
                                : item.slaStatus === "atRisk"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {item.slaStatus ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.status?.name ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.createdAt
                            ? new Intl.DateTimeFormat().format(new Date(item.createdAt))
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* Issue edit dialog */}
        {editIssueId && (
          <IssueEditDialog
            open={!!editIssueId}
            onOpenChange={(open) => {
              if (!open) setEditIssueId(null);
            }}
            issueId={editIssueId}
          />
        )}
      </div>

      {/* Create Queue Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createQueue")}</DialogTitle>
            <DialogDescription>
              {t("createQueueDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="queue-name">{t("queueName")}</Label>
              <Input
                id="queue-name"
                placeholder={t("queueNamePlaceholder")}
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitCreateQueue();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-description">
                {t("queueDescription")} <span className="text-muted-foreground">({tc("optional")})</span>
              </Label>
              <Textarea
                id="queue-description"
                placeholder={t("queueDescriptionPlaceholder")}
                value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("filterByIssueType")}</Label>
              <Select value={filterIssueTypeId} onValueChange={setFilterIssueTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder={tc("all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {(issueTypes ?? []).map((it: { id: string; name: string }) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("filterByPriority")}</Label>
              <Select value={filterPriorityId} onValueChange={setFilterPriorityId}>
                <SelectTrigger>
                  <SelectValue placeholder={tc("all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {(priorities ?? []).map((p: { id: string; name: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSubmitCreateQueue}
              disabled={!newQueueName.trim() || createQueueMutation.isPending}
            >
              {createQueueMutation.isPending ? tc("loading") : t("createQueue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Project-scoped queue page.
 *
 * @description Service desk queue for the project. Shows incoming requests
 * and issues with priority and SLA columns in a filterable table.
 *
 * @module project-queue-page
 */
"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Inbox } from "lucide-react";
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
  } = trpc.queue.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

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

  const isLoading = projectLoading || queuesLoading || issuesLoading;
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {key.toUpperCase()} {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        {/* Queue selector tabs */}
        {queues && queues.length > 1 && (
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
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {item.key}
                      </span>
                    </TableCell>
                    <TableCell>{item.summary}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.requester ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.priority ?? "-"}</Badge>
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
                      <Badge variant="secondary">{item.status ?? "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdAt ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

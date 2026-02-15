/**
 * Admin webhook management page.
 *
 * @description Lists webhook configurations with create/edit dialog,
 * event subscription selection, secret management, active toggle,
 * and test webhook functionality.
 *
 * @module admin-webhooks
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";

/**
 * Available webhook event types for subscription.
 */
const WEBHOOK_EVENTS = [
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "issue.transitioned",
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "sprint.started",
  "sprint.completed",
  "user.created",
  "user.deactivated",
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export default function AdminWebhooksPage() {
  const t = useTranslations("admin.webhooks");
  const tc = useTranslations("common");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookActive, setWebhookActive] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(
    new Set(),
  );
  const [testingId, setTestingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const {
    data: webhooksData,
    isLoading,
    error,
  } = trpc.admin.listWebhooks.useQuery({});

  const webhooks = webhooksData?.items ?? [];

  const createMutation = trpc.admin.createWebhook.useMutation({
    onSuccess: () => {
      void utils.admin.listWebhooks.invalidate();
      resetForm();
    },
  });

  const deleteMutation = trpc.admin.deleteWebhook.useMutation({
    onSuccess: () => {
      void utils.admin.listWebhooks.invalidate();
    },
  });

  /**
   * Toggles a webhook event in the selected events set.
   */
  function toggleEvent(event: WebhookEvent) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  }

  /**
   * Resets the dialog form to default values.
   */
  function resetForm() {
    setWebhookUrl("");
    setWebhookSecret("");
    setWebhookActive(true);
    setSelectedEvents(new Set());
    setDialogOpen(false);
  }

  /**
   * Handles the create webhook form submission.
   */
  function handleCreate() {
    if (!webhookUrl || selectedEvents.size === 0) return;
    createMutation.mutate({
      url: webhookUrl,
      events: Array.from(selectedEvents),
      secret: webhookSecret || undefined,
      isActive: webhookActive,
    });
  }

  /**
   * Simulates sending a test webhook payload to the configured URL.
   */
  function handleTestWebhook(webhookId: string) {
    setTestingId(webhookId);
    // TODO: Replace with tRPC admin.testWebhook mutation when implemented
    setTimeout(() => setTestingId(null), 2000);
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createWebhook")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createWebhook")}</DialogTitle>
              <DialogDescription>
                {t("createWebhookDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* URL */}
              <div className="grid gap-2">
                <Label htmlFor="webhook-url">{t("url")}</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder={t("urlPlaceholder")}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              {/* Secret */}
              <div className="grid gap-2">
                <Label htmlFor="webhook-secret">{t("secret")}</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  placeholder={t("secretPlaceholder")}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("secretHelp")}
                </p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  id="webhook-active"
                  checked={webhookActive}
                  onCheckedChange={setWebhookActive}
                />
                <Label htmlFor="webhook-active">{t("active")}</Label>
              </div>

              {/* Event subscriptions */}
              <div className="grid gap-2">
                <Label>{t("events")}</Label>
                <div className="grid gap-2 rounded-md border p-3">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center gap-3">
                      <Checkbox
                        id={`event-${event}`}
                        checked={selectedEvents.has(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <Label
                        htmlFor={`event-${event}`}
                        className="text-sm font-normal"
                      >
                        {t(`eventTypes.${event}` as "eventTypes.issue.created")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !webhookUrl || selectedEvents.size === 0}
              >
                {createMutation.isPending ? tc("saving") : tc("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Webhooks table */}
      {isLoading ? (
        <WebhooksSkeleton />
      ) : !error && webhooks.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noWebhooks")}
          description={t("noWebhooksDescription")}
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createWebhook")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <span className="sr-only">{tc("status")}</span>
                </TableHead>
                <TableHead>{t("url")}</TableHead>
                <TableHead className="w-[200px]">{t("events")}</TableHead>
                <TableHead className="w-[120px]">{t("lastTriggered")}</TableHead>
                <TableHead className="w-[100px]">{tc("status")}</TableHead>
                <TableHead className="w-[60px]">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => {
                const events = (webhook.events ?? []) as string[];
                return (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      {webhook.isActive ? (
                        <CheckCircle2
                          className="size-4 text-green-600 dark:text-green-400"
                          aria-label={t("active")}
                        />
                      ) : (
                        <XCircle
                          className="size-4 text-muted-foreground"
                          aria-label={t("inactive")}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate font-mono text-sm">
                          {webhook.url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {events
                          .slice(0, 3)
                          .map((event: string) => (
                            <Badge
                              key={event}
                              variant="secondary"
                              className="text-xs"
                            >
                              {event}
                            </Badge>
                          ))}
                        {events.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{events.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(webhook as { lastTriggeredAt?: string | Date | null }).lastTriggeredAt
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date((webhook as { lastTriggeredAt: string | Date }).lastTriggeredAt))
                        : t("neverTriggered")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          webhook.isActive
                            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }
                      >
                        {webhook.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                          <DropdownMenuItem
                            onClick={() => handleTestWebhook(webhook.id)}
                            disabled={testingId === webhook.id}
                          >
                            <Send className="mr-2 size-4" aria-hidden="true" />
                            {testingId === webhook.id
                              ? t("testing")
                              : t("testWebhook")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              deleteMutation.mutate({ id: webhook.id });
                            }}
                          >
                            <Trash2
                              className="mr-2 size-4"
                              aria-hidden="true"
                            />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the webhooks table.
 */
function WebhooksSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"><Skeleton className="size-4" /></TableHead>
            <TableHead><Skeleton className="h-4 w-48" /></TableHead>
            <TableHead className="w-[200px]"><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="size-4 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-56" /></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="size-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

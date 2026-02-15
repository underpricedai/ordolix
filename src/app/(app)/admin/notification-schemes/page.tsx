/**
 * Admin notification scheme editor page.
 *
 * @description Manages event → channel notification rules per scheme.
 * Follows the same pattern as the permission scheme editor.
 *
 * @module admin-notification-schemes
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Bell, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

const NOTIFICATION_EVENTS = [
  "issue_created",
  "issue_updated",
  "issue_assigned",
  "issue_resolved",
  "comment_added",
  "status_changed",
  "sla_warning",
  "approval_requested",
] as const;

const RECIPIENT_TYPES = [
  "reporter",
  "assignee",
  "project_lead",
  "watchers",
  "all_members",
] as const;

export default function AdminNotificationSchemesPage() {
  const t = useTranslations("admin.notificationSchemes");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: schemes, isLoading } = trpc.notification.listSchemes.useQuery();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addEvent, setAddEvent] = useState("");
  const [addRecipient, setAddRecipient] = useState("");

  const effectiveSchemeId = selectedSchemeId || schemes?.[0]?.id || "";

  const { data: schemeDetail } = trpc.notification.getScheme.useQuery(
    { id: effectiveSchemeId },
    { enabled: !!effectiveSchemeId },
  );

  const createScheme = trpc.notification.createScheme.useMutation({
    onSuccess: () => {
      utils.notification.listSchemes.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });

  const deleteScheme = trpc.notification.deleteScheme.useMutation({
    onSuccess: () => {
      utils.notification.listSchemes.invalidate();
      setSelectedSchemeId("");
    },
  });

  const addEntry = trpc.notification.addSchemeEntry.useMutation({
    onSuccess: () => {
      utils.notification.getScheme.invalidate();
      setAddEvent("");
      setAddRecipient("");
    },
  });

  const removeEntry = trpc.notification.removeSchemeEntry.useMutation({
    onSuccess: () => utils.notification.getScheme.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          {effectiveSchemeId && (
            <Button variant="outline" onClick={() => deleteScheme.mutate({ id: effectiveSchemeId })}>
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
          <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createScheme")}
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{t("createScheme")}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>{t("createSchemeDescription")}</ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ns-name">{tc("name")}</Label>
                  <Input id="ns-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ns-desc">{tc("details")}</Label>
                  <Input id="ns-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
                <Button
                  onClick={() => createScheme.mutate({ name: newName, description: newDesc || undefined })}
                  disabled={!newName.trim() || createScheme.isPending}
                >
                  {tc("create")}
                </Button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </div>

      {/* Scheme selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="ns-select" className="text-sm font-medium">{t("selectScheme")}</label>
        <Select value={effectiveSchemeId} onValueChange={setSelectedSchemeId}>
          <SelectTrigger id="ns-select" className="w-64">
            <SelectValue placeholder={t("selectScheme")} />
          </SelectTrigger>
          <SelectContent>
            {schemes?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Event → recipient mapping table */}
      {effectiveSchemeId && schemeDetail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="size-5" aria-hidden="true" />
                <CardTitle>{schemeDetail.name}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Select value={addEvent} onValueChange={setAddEvent}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("event")} />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_EVENTS.map((evt) => (
                      <SelectItem key={evt} value={evt}>{evt.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addRecipient} onValueChange={setAddRecipient}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("recipientType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!addEvent || !addRecipient || addEntry.isPending}
                  onClick={() =>
                    addEntry.mutate({
                      notificationSchemeId: effectiveSchemeId,
                      event: addEvent,
                      recipientType: addRecipient,
                    })
                  }
                >
                  <Plus className="mr-1 size-4" aria-hidden="true" />
                  {t("addEntry")}
                </Button>
              </div>
            </div>
            <CardDescription>{schemeDetail.description ?? t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("event")}</TableHead>
                    <TableHead>{t("recipientType")}</TableHead>
                    <TableHead>{t("channels")}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemeDetail.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t("noSchemes")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemeDetail.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.event.replace(/_/g, " ")}</TableCell>
                        <TableCell>{entry.recipientType.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(Array.isArray(entry.channels) ? (entry.channels as unknown as string[]) : []).map((ch) => (
                              <Badge key={ch} variant="secondary">{ch}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeEntry.mutate({ id: entry.id })}>
                            <Trash2 className="size-4" aria-hidden="true" />
                            <span className="sr-only">{t("removeEntry")}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {(!schemes || schemes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSchemes")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Admin issue type scheme editor page.
 *
 * @description Provides scheme selection, CRUD, and entry management
 * for issue type schemes. Follows the same pattern as the permission
 * scheme editor.
 *
 * @module admin-issue-type-schemes
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, FileType, Trash2 } from "lucide-react";
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

export default function AdminIssueTypeSchemesPage() {
  const t = useTranslations("admin.issueTypeSchemes");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: schemes, isLoading } = trpc.admin.listIssueTypeSchemes.useQuery();
  const { data: issueTypes } = trpc.admin.listIssueTypes.useQuery();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const effectiveSchemeId = selectedSchemeId || schemes?.[0]?.id || "";

  const { data: schemeDetail } = trpc.admin.getIssueTypeScheme.useQuery(
    { id: effectiveSchemeId },
    { enabled: !!effectiveSchemeId },
  );

  const createScheme = trpc.admin.createIssueTypeScheme.useMutation({
    onSuccess: () => {
      utils.admin.listIssueTypeSchemes.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });

  const deleteScheme = trpc.admin.deleteIssueTypeScheme.useMutation({
    onSuccess: () => {
      utils.admin.listIssueTypeSchemes.invalidate();
      setSelectedSchemeId("");
    },
  });

  const addEntry = trpc.admin.addIssueTypeSchemeEntry.useMutation({
    onSuccess: () => utils.admin.getIssueTypeScheme.invalidate(),
  });

  const removeEntry = trpc.admin.removeIssueTypeSchemeEntry.useMutation({
    onSuccess: () => utils.admin.getIssueTypeScheme.invalidate(),
  });

  // Issue types already in the scheme
  const assignedIds = new Set(schemeDetail?.entries.map((e) => e.issueTypeId) ?? []);
  const availableTypes = issueTypes?.filter((it) => !assignedIds.has(it.id)) ?? [];

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          {effectiveSchemeId && (
            <Button
              variant="outline"
              onClick={() => deleteScheme.mutate({ id: effectiveSchemeId })}
            >
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
                  <Label htmlFor="scheme-name">{tc("name")}</Label>
                  <Input id="scheme-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheme-desc">{tc("details")}</Label>
                  <Input id="scheme-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
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
        <label htmlFor="scheme-select" className="text-sm font-medium">{t("selectScheme")}</label>
        <Select value={effectiveSchemeId} onValueChange={setSelectedSchemeId}>
          <SelectTrigger id="scheme-select" className="w-64">
            <SelectValue placeholder={t("selectScheme")} />
          </SelectTrigger>
          <SelectContent>
            {schemes?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry table */}
      {effectiveSchemeId && schemeDetail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileType className="size-5" aria-hidden="true" />
                <CardTitle>{schemeDetail.name}</CardTitle>
              </div>
              {availableTypes.length > 0 && (
                <Select
                  onValueChange={(issueTypeId) =>
                    addEntry.mutate({
                      issueTypeSchemeId: effectiveSchemeId,
                      issueTypeId,
                      position: schemeDetail.entries.length,
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("addEntry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((it) => (
                      <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <CardDescription>{schemeDetail.description ?? t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc("name")}</TableHead>
                    <TableHead className="w-24 text-center">{t("default")}</TableHead>
                    <TableHead className="w-24 text-center">{t("position")}</TableHead>
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
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full"
                              style={{ backgroundColor: entry.issueType.color }}
                              aria-hidden="true"
                            />
                            {entry.issueType.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.isDefault && <Badge variant="secondary">{t("default")}</Badge>}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {entry.position}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry.mutate({ id: entry.id })}
                          >
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

      {/* Empty state */}
      {(!schemes || schemes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileType className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSchemes")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

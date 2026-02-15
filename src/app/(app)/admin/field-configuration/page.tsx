/**
 * Admin field configuration scheme editor page.
 *
 * @description Manages which custom fields are visible/required per project.
 * Follows the same pattern as the permission scheme editor.
 *
 * @module admin-field-configuration
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

export default function AdminFieldConfigurationPage() {
  const t = useTranslations("admin.fieldConfiguration");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: schemes, isLoading } = trpc.customField.listFieldConfigSchemes.useQuery();
  const { data: fields } = trpc.customField.list.useQuery({});

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const effectiveSchemeId = selectedSchemeId || schemes?.[0]?.id || "";

  const { data: schemeDetail } = trpc.customField.getFieldConfigScheme.useQuery(
    { id: effectiveSchemeId },
    { enabled: !!effectiveSchemeId },
  );

  const createScheme = trpc.customField.createFieldConfigScheme.useMutation({
    onSuccess: () => {
      utils.customField.listFieldConfigSchemes.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });

  const deleteScheme = trpc.customField.deleteFieldConfigScheme.useMutation({
    onSuccess: () => {
      utils.customField.listFieldConfigSchemes.invalidate();
      setSelectedSchemeId("");
    },
  });

  const addEntry = trpc.customField.addFieldConfigEntry.useMutation({
    onSuccess: () => utils.customField.getFieldConfigScheme.invalidate(),
  });

  const updateEntry = trpc.customField.updateFieldConfigEntry.useMutation({
    onSuccess: () => utils.customField.getFieldConfigScheme.invalidate(),
  });

  const removeEntry = trpc.customField.removeFieldConfigEntry.useMutation({
    onSuccess: () => utils.customField.getFieldConfigScheme.invalidate(),
  });

  const assignedFieldIds = new Set(schemeDetail?.entries.map((e) => e.customFieldId) ?? []);
  const availableFields = fields?.filter((f) => !assignedFieldIds.has(f.id)) ?? [];

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
                  <Label htmlFor="fc-name">{tc("name")}</Label>
                  <Input id="fc-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fc-desc">{tc("details")}</Label>
                  <Input id="fc-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
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
        <label htmlFor="fc-select" className="text-sm font-medium">{t("selectScheme")}</label>
        <Select value={effectiveSchemeId} onValueChange={setSelectedSchemeId}>
          <SelectTrigger id="fc-select" className="w-64">
            <SelectValue placeholder={t("selectScheme")} />
          </SelectTrigger>
          <SelectContent>
            {schemes?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Field visibility/required matrix */}
      {effectiveSchemeId && schemeDetail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-5" aria-hidden="true" />
                <CardTitle>{schemeDetail.name}</CardTitle>
              </div>
              {availableFields.length > 0 && (
                <Select
                  onValueChange={(fieldId) =>
                    addEntry.mutate({
                      fieldConfigurationSchemeId: effectiveSchemeId,
                      customFieldId: fieldId,
                      position: schemeDetail.entries.length,
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("addField")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
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
                    <TableHead className="w-24 text-center">{t("visible")}</TableHead>
                    <TableHead className="w-24 text-center">{t("required")}</TableHead>
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
                        <TableCell className="font-medium">{entry.customField.name}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={entry.isVisible}
                            onCheckedChange={(checked) =>
                              updateEntry.mutate({ id: entry.id, isVisible: !!checked })
                            }
                            aria-label={`${entry.customField.name} - ${t("visible")}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={entry.isRequired}
                            onCheckedChange={(checked) =>
                              updateEntry.mutate({ id: entry.id, isRequired: !!checked })
                            }
                            aria-label={`${entry.customField.name} - ${t("required")}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeEntry.mutate({ id: entry.id })}>
                            <Trash2 className="size-4" aria-hidden="true" />
                            <span className="sr-only">{t("removeField")}</span>
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
            <SlidersHorizontal className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSchemes")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

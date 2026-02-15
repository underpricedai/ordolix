/**
 * Admin custom field management page.
 *
 * @description Displays a table of custom fields with name, type, context,
 * required flag, and screen assignments. Includes a create field dialog
 * supporting multiple field types.
 *
 * @module admin-fields
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Inbox,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
 * Available custom field types.
 */
const FIELD_TYPES = [
  "text",
  "number",
  "select",
  "multiSelect",
  "date",
  "userPicker",
  "labels",
  "url",
  "cascadingSelect",
] as const;

export default function AdminFieldsPage() {
  const t = useTranslations("admin.fields");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [fieldContext, setFieldContext] = useState<string>("issue");
  const [isRequired, setIsRequired] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: fields,
    isLoading,
    error,
  } = trpc.customField.list.useQuery({});

  const createMutation = trpc.customField.create.useMutation({
    onSuccess: () => {
      void utils.customField.list.invalidate();
      resetForm();
    },
  });

  const deleteMutation = trpc.customField.delete.useMutation({
    onSuccess: () => {
      void utils.customField.list.invalidate();
    },
  });

  function resetForm() {
    setFieldName("");
    setFieldType("text");
    setFieldContext("issue");
    setIsRequired(false);
    setCreateOpen(false);
  }

  /**
   * Handles the create field form submission.
   */
  function handleCreate() {
    if (!fieldName) return;
    createMutation.mutate({
      name: fieldName,
      fieldType: fieldType as "text" | "number" | "date" | "select" | "multiSelect" | "checkbox" | "url" | "user" | "label",
      isRequired,
      context: fieldContext as "issue" | "project" | "asset",
    });
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createField")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("createField")}</DialogTitle>
              <DialogDescription>{t("createFieldDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="field-name">{t("fieldName")}</Label>
                <Input
                  id="field-name"
                  placeholder={t("fieldNamePlaceholder")}
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="field-type">{t("fieldType")}</Label>
                <Select value={fieldType} onValueChange={setFieldType}>
                  <SelectTrigger id="field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="field-context">{t("context")}</Label>
                <Select value={fieldContext} onValueChange={setFieldContext}>
                  <SelectTrigger id="field-context">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">{t("contextGlobal")}</SelectItem>
                    <SelectItem value="project">{t("contextProject")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="field-required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label htmlFor="field-required">{t("isRequired")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !fieldName}
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

      {/* Fields table */}
      {isLoading ? (
        <FieldsTableSkeleton />
      ) : !error && (fields ?? []).length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noFields")}
          description={t("noFieldsDescription")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createField")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <span className="sr-only">{t("dragToReorder")}</span>
                </TableHead>
                <TableHead>{tc("name")}</TableHead>
                <TableHead className="w-[140px]">{tc("type")}</TableHead>
                <TableHead className="w-[140px]">{t("context")}</TableHead>
                <TableHead className="w-[100px]">{tc("required")}</TableHead>
                <TableHead className="w-[140px]">{t("screens")}</TableHead>
                <TableHead className="w-[60px]">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fields ?? []).map((field) => {
                const context = field.context as { type?: string } | null;
                const contextType = context?.type ?? "issue";
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <button
                        className="cursor-grab text-muted-foreground hover:text-foreground"
                        aria-label={t("dragToReorder")}
                      >
                        <GripVertical className="size-4" aria-hidden="true" />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {t(`types.${field.fieldType}` as "types.text")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {contextType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.isRequired ? (
                        <Badge className="text-xs">{tc("required")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {tc("optional")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      -
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
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Pencil className="mr-2 size-4" aria-hidden="true" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              deleteMutation.mutate({ id: field.id });
                            }}
                          >
                            <Trash2 className="mr-2 size-4" aria-hidden="true" />
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
 * Skeleton loading state for the fields table.
 */
function FieldsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"><Skeleton className="size-4" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="size-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="size-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

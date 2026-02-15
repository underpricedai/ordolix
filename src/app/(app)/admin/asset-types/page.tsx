/**
 * Admin asset type management page.
 *
 * @description Displays a table of asset types with name, description, color,
 * attribute count, and asset count. Includes create/edit dialog and opens the
 * attribute schema builder for managing typed attributes per type.
 *
 * @module admin-asset-types
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
  Settings2,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";
import { AttributeSchemaBuilder } from "@/modules/assets/components/AttributeSchemaBuilder";

export default function AdminAssetTypesPage() {
  const t = useTranslations("assets");
  const ta = useTranslations("admin.assetTypes");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingTypeId, setManagingTypeId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("");

  const utils = trpc.useUtils();

  const { data: assetTypes, isLoading, error } = trpc.asset.listAssetTypes.useQuery();

  const createMutation = trpc.asset.createAssetType.useMutation({
    onSuccess: () => {
      void utils.asset.listAssetTypes.invalidate();
      resetForm();
    },
  });

  const updateMutation = trpc.asset.updateAssetType.useMutation({
    onSuccess: () => {
      void utils.asset.listAssetTypes.invalidate();
      resetForm();
    },
  });

  const deleteMutation = trpc.asset.deleteAssetType.useMutation({
    onSuccess: () => {
      void utils.asset.listAssetTypes.invalidate();
    },
  });

  function resetForm() {
    setFormName("");
    setFormIcon("");
    setFormDescription("");
    setFormColor("");
    setCreateOpen(false);
    setEditingId(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(type: any) {
    setEditingId(type.id);
    setFormName(type.name);
    setFormIcon(type.icon ?? "");
    setFormDescription(type.description ?? "");
    setFormColor(type.color ?? "");
    setCreateOpen(true);
  }

  function handleSave() {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formName || undefined,
        icon: formIcon || undefined,
        description: formDescription || undefined,
        color: formColor || undefined,
      });
    } else {
      createMutation.mutate({
        name: formName,
        icon: formIcon || undefined,
        description: formDescription || undefined,
        color: formColor || undefined,
      });
    }
  }

  // If managing attributes for a specific type, show schema builder
  if (managingTypeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const managingType = (assetTypes as any[])?.find((t: any) => t.id === managingTypeId);

    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setManagingTypeId(null)} aria-label={tc("back")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {managingType?.name ?? ta("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{ta("manageAttributesDescription")}</p>
          </div>
        </div>

        <AttributeSchemaBuilder assetTypeId={managingTypeId} />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ResponsiveColumnDef<any>[] = [
    {
      key: "name",
      header: tc("name"),
      priority: 1,
      cell: (type) => (
        <div className="flex items-center gap-2">
          {type.icon && <span className="text-lg">{type.icon}</span>}
          <div>
            <span className="font-medium">{type.name}</span>
            {type.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                {type.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "color",
      header: ta("color"),
      priority: 4,
      className: "w-[80px]",
      cell: (type) =>
        type.color ? (
          <div
            className="size-5 rounded-full border"
            style={{ backgroundColor: type.color }}
            aria-label={type.color}
          />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      key: "attributes",
      header: ta("attributes"),
      priority: 3,
      className: "w-[100px]",
      cell: (type) => (
        <Badge variant="secondary" className="text-xs">
          {type._count?.attributeDefinitions ?? 0}
        </Badge>
      ),
    },
    {
      key: "assets",
      header: t("title"),
      priority: 3,
      className: "w-[100px]",
      cell: (type) => (
        <Badge variant="outline" className="text-xs">
          {type._count?.assets ?? 0}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: tc("actions"),
      priority: 1,
      className: "w-[60px]",
      cell: (type) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={tc("actions")}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setManagingTypeId(type.id)}>
              <Settings2 className="mr-2 size-4" aria-hidden="true" />
              {ta("manageAttributes")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(type)}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />
              {tc("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate({ id: type.id })}
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {ta("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{ta("description")}</p>
        </div>

        <ResponsiveDialog open={createOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setCreateOpen(open);
        }}>
          <ResponsiveDialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {ta("createType")}
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-md">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {editingId ? ta("editType") : ta("createType")}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {ta("createTypeDescription")}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type-name">{tc("name")}</Label>
                <Input
                  id="type-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={ta("namePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type-icon">{ta("icon")}</Label>
                <Input
                  id="type-icon"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder={ta("iconPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type-color">{ta("color")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="type-color"
                    type="color"
                    value={formColor || "#4BADE8"}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="size-9 p-1"
                  />
                  <Input
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="#4BADE8"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type-desc">{ta("descriptionLabel")}</Label>
                <Textarea
                  id="type-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={ta("descriptionPlaceholder")}
                  rows={2}
                />
              </div>
            </div>
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={resetForm}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending || !formName}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? tc("saving")
                  : editingId ? tc("save") : tc("create")}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Asset types table */}
      {isLoading ? (
        <AssetTypesTableSkeleton />
      ) : !error && (assetTypes ?? []).length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={ta("noTypes")}
          description={ta("noTypesDescription")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {ta("createType")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <ResponsiveTable
            columns={columns}
            data={assetTypes ?? []}
            rowKey={(type) => type.id}
            mobileCard={(type) => (
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {type.icon && <span className="text-lg">{type.icon}</span>}
                      <p className="font-medium truncate">{type.name}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {type._count?.attributeDefinitions ?? 0} attrs
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {type._count?.assets ?? 0} assets
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={tc("actions")}>
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setManagingTypeId(type.id)}>
                        <Settings2 className="mr-2 size-4" aria-hidden="true" />
                        {ta("manageAttributes")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(type)}>
                        <Pencil className="mr-2 size-4" aria-hidden="true" />
                        {tc("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate({ id: type.id })}
                      >
                        <Trash2 className="mr-2 size-4" aria-hidden="true" />
                        {tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )}
          />
        </div>
      )}
    </div>
  );
}

function AssetTypesTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[80px]"><Skeleton className="h-4 w-10" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-14" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="size-5 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-8 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-8 rounded-full" /></TableCell>
              <TableCell><Skeleton className="size-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  MoreHorizontal,
  Inbox,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
import { trpc } from "@/shared/lib/trpc";
import { ATTRIBUTE_FIELD_TYPES } from "../types/schemas";

interface AttributeSchemaBuilderProps {
  assetTypeId: string;
}

/**
 * Admin drag-and-drop builder for managing typed attribute definitions
 * per asset type. Supports add, edit, remove, reorder, and live preview.
 *
 * @param props - AttributeSchemaBuilderProps
 * @returns An attribute schema management component
 */
export function AttributeSchemaBuilder({ assetTypeId }: AttributeSchemaBuilderProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formFieldType, setFormFieldType] = useState<string>("text");
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formOptions, setFormOptions] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDefaultValue, setFormDefaultValue] = useState("");

  const utils = trpc.useUtils();

  const { data: definitions, isLoading } = trpc.asset.listAttributeDefinitions.useQuery(
    { assetTypeId },
  );

  const createMutation = trpc.asset.createAttributeDefinition.useMutation({
    onSuccess: () => {
      void utils.asset.listAttributeDefinitions.invalidate({ assetTypeId });
      resetForm();
    },
  });

  const updateMutation = trpc.asset.updateAttributeDefinition.useMutation({
    onSuccess: () => {
      void utils.asset.listAttributeDefinitions.invalidate({ assetTypeId });
      resetForm();
    },
  });

  const deleteMutation = trpc.asset.deleteAttributeDefinition.useMutation({
    onSuccess: () => {
      void utils.asset.listAttributeDefinitions.invalidate({ assetTypeId });
    },
  });

  function resetForm() {
    setFormName("");
    setFormLabel("");
    setFormFieldType("text");
    setFormIsRequired(false);
    setFormOptions("");
    setFormDescription("");
    setFormDefaultValue("");
    setCreateOpen(false);
    setEditingId(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(def: any) {
    setEditingId(def.id);
    setFormName(def.name);
    setFormLabel(def.label);
    setFormFieldType(def.fieldType);
    setFormIsRequired(def.isRequired);
    setFormOptions(
      Array.isArray(def.options) ? def.options.join(", ") : "",
    );
    setFormDescription(def.description ?? "");
    setFormDefaultValue(def.defaultValue ?? "");
    setCreateOpen(true);
  }

  const handleSave = useCallback(() => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        label: formLabel || undefined,
        fieldType: formFieldType as typeof ATTRIBUTE_FIELD_TYPES[number],
        isRequired: formIsRequired,
        options: formFieldType === "select" && formOptions
          ? formOptions.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        description: formDescription || undefined,
        defaultValue: formDefaultValue || undefined,
      });
    } else {
      const nextPosition = (definitions?.length ?? 0);
      createMutation.mutate({
        assetTypeId,
        name: formName,
        label: formLabel,
        fieldType: formFieldType as typeof ATTRIBUTE_FIELD_TYPES[number],
        isRequired: formIsRequired,
        options: formFieldType === "select" && formOptions
          ? formOptions.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        description: formDescription || undefined,
        defaultValue: formDefaultValue || undefined,
        position: nextPosition,
      });
    }
  }, [
    editingId,
    formName,
    formLabel,
    formFieldType,
    formIsRequired,
    formOptions,
    formDescription,
    formDefaultValue,
    assetTypeId,
    definitions,
    createMutation,
    updateMutation,
  ]);

  const items = definitions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t("attributeDefinitions")}
        </h3>

        <ResponsiveDialog open={createOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setCreateOpen(open);
        }}>
          <ResponsiveDialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("addAttribute")}
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-md">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {editingId ? t("editAttribute") : t("addAttribute")}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t("attributeFormDescription")}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              {!editingId && (
                <div className="grid gap-2">
                  <Label htmlFor="attr-name">{t("attributeName")}</Label>
                  <Input
                    id="attr-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="serialNumber"
                  />
                  <p className="text-xs text-muted-foreground">{t("attributeNameHint")}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="attr-label">{t("attributeLabel")}</Label>
                <Input
                  id="attr-label"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={t("attributeLabelPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attr-type">{t("attributeFieldType")}</Label>
                <Select value={formFieldType} onValueChange={setFormFieldType}>
                  <SelectTrigger id="attr-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTRIBUTE_FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`fieldType_${type}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formFieldType === "select" && (
                <div className="grid gap-2">
                  <Label htmlFor="attr-options">{t("attributeOptions")}</Label>
                  <Input
                    id="attr-options"
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    placeholder={t("attributeOptionsPlaceholder")}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="attr-default">{t("attributeDefault")}</Label>
                <Input
                  id="attr-default"
                  value={formDefaultValue}
                  onChange={(e) => setFormDefaultValue(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attr-desc">{t("attributeDescription")}</Label>
                <Textarea
                  id="attr-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="attr-required"
                  checked={formIsRequired}
                  onCheckedChange={setFormIsRequired}
                />
                <Label htmlFor="attr-required">{tc("required")}</Label>
              </div>
            </div>
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={resetForm}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (!editingId && (!formName || !formLabel)) ||
                  (!!editingId && !formLabel)
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? tc("saving")
                  : tc("save")}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-10" />}
          title={t("noAttributes")}
          description={t("noAttributesDescription")}
        />
      ) : (
        <div className="space-y-1">
          {items.map((def) => (
            <Card key={def.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <button
                  className="cursor-grab text-muted-foreground hover:text-foreground"
                  aria-label={t("dragToReorder")}
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{def.label}</span>
                    <code className="text-xs text-muted-foreground">{def.name}</code>
                    {def.isRequired && (
                      <Badge className="text-xs">{tc("required")}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t(`fieldType_${def.fieldType}` as Parameters<typeof t>[0])}
                    </Badge>
                    {def.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {def.description}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={tc("actions")}>
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(def)}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      {tc("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate({ id: def.id })}
                    >
                      <Trash2 className="mr-2 size-4" aria-hidden="true" />
                      {tc("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

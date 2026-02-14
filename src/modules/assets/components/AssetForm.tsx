"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { trpc } from "@/shared/lib/trpc";

/**
 * JSON schema field definition for dynamic asset forms.
 */
interface SchemaField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface AssetFormProps {
  /** Asset ID for editing, undefined for create mode */
  assetId?: string;
  /** Pre-selected asset type ID */
  assetTypeId?: string;
  /** Callback on successful save */
  onSave?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
}

/**
 * AssetForm renders a dynamic create/edit form based on the asset type schema.
 *
 * @description The form fields are driven by the JSON schema of the selected
 * asset type. Includes core fields (name, type, status) plus dynamic attributes
 * based on the schema definition.
 *
 * @param props - AssetFormProps
 * @returns A dynamic asset form component
 *
 * @example
 * <AssetForm assetTypeId="server" onSave={handleSave} onCancel={handleCancel} />
 */
export function AssetForm({
  assetId,
  assetTypeId,
  onSave,
  onCancel,
}: AssetFormProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const isEdit = Boolean(assetId);

  // Core form state
  const [name, setName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState(assetTypeId ?? "");
  const [status, setStatus] = useState("active");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  // tRPC mutations
  const createMutation = trpc.asset.createAsset.useMutation();
  const updateMutation = trpc.asset.updateAsset.useMutation();

  // Load existing asset for editing
  const { data: existingAsset } = trpc.asset.getAsset.useQuery(
    { id: assetId ?? "" },
    { enabled: Boolean(assetId) },
  );

  useEffect(() => {
    if (existingAsset) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existingAsset as any;
      setName(data.name ?? "");
      setSelectedTypeId(data.assetTypeId ?? "");
      setStatus(data.status ?? "active");
      setAttributes(data.attributes ?? {});
    }
  }, [existingAsset]);

  // Derive schema fields from the asset type
  // In production this would come from the asset type's schema definition
  const schemaFields: SchemaField[] = useMemo(() => {
    // Placeholder schema based on common asset fields
    // Real implementation would fetch from asset type schema
    const baseFields: SchemaField[] = [
      {
        key: "serialNumber",
        label: t("serialNumber"),
        type: "string",
        placeholder: "SN-XXXXXXXX",
      },
      {
        key: "manufacturer",
        label: t("manufacturer"),
        type: "string",
        placeholder: t("manufacturerPlaceholder"),
      },
      {
        key: "model",
        label: t("model"),
        type: "string",
        placeholder: t("modelPlaceholder"),
      },
      {
        key: "location",
        label: t("location"),
        type: "string",
        placeholder: t("locationPlaceholder"),
      },
      {
        key: "purchaseDate",
        label: t("purchaseDate"),
        type: "string",
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "warrantyExpiry",
        label: t("warrantyExpiry"),
        type: "string",
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "notes",
        label: t("notes"),
        type: "textarea",
        placeholder: t("notesPlaceholder"),
      },
    ];
    return baseFields;
  }, [t]);

  const updateAttribute = useCallback((key: string, value: unknown) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (isEdit && assetId) {
        await updateMutation.mutateAsync({
          id: assetId,
          name,
          status,
          attributes,
        });
      } else {
        await createMutation.mutateAsync({
          assetTypeId: selectedTypeId,
          name,
          status,
          attributes,
        });
      }
      onSave?.();
    } finally {
      setIsSaving(false);
    }
  }, [
    isEdit,
    assetId,
    name,
    selectedTypeId,
    status,
    attributes,
    createMutation,
    updateMutation,
    onSave,
  ]);

  return (
    <div className="space-y-6">
      {/* Core fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="asset-name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="asset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label>{t("type")}</Label>
          <Select
            value={selectedTypeId}
            onValueChange={setSelectedTypeId}
            disabled={isEdit}
          >
            <SelectTrigger aria-label={t("type")}>
              <SelectValue placeholder={t("selectType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="server">{t("typeServer")}</SelectItem>
              <SelectItem value="laptop">{t("typeLaptop")}</SelectItem>
              <SelectItem value="software">{t("typeSoftware")}</SelectItem>
              <SelectItem value="network">{t("typeNetwork")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>{t("status")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label={t("status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("statusActive")}</SelectItem>
              <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
              <SelectItem value="maintenance">{t("statusMaintenance")}</SelectItem>
              <SelectItem value="retired">{t("statusRetired")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Dynamic schema-driven fields */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {t("additionalProperties")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {schemaFields.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={attributes[field.key]}
              onChange={(val) => updateAttribute(field.key, val)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={!name.trim() || !selectedTypeId || isSaving}>
          <Save className="mr-2 size-4" aria-hidden="true" />
          {isSaving ? tc("loading") : isEdit ? tc("save") : tc("create")}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {tc("cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a single form field based on the JSON schema type.
 */
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const fieldId = `asset-field-${field.key}`;

  switch (field.type) {
    case "string":
    case "number":
      return (
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={fieldId}
            type={field.type === "number" ? "number" : "text"}
            value={String(value ?? "")}
            onChange={(e) =>
              onChange(
                field.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            placeholder={field.placeholder}
            required={field.required}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Textarea
            id={fieldId}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <Label htmlFor={fieldId}>{field.label}</Label>
        </div>
      );

    case "select":
      return (
        <div className="grid gap-2">
          <Label>{field.label}</Label>
          <Select
            value={String(value ?? "")}
            onValueChange={onChange}
          >
            <SelectTrigger aria-label={field.label}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}

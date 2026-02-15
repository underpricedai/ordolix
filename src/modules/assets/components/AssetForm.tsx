"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { trpc } from "@/shared/lib/trpc";
import { ASSET_STATUSES, COST_TYPES, DEPRECIATION_METHODS } from "../types/schemas";

interface AssetFormProps {
  assetId?: string;
  assetTypeId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

/**
 * AssetForm renders a dynamic create/edit form driven by typed attribute
 * definitions from the database.
 *
 * @param props - AssetFormProps
 * @returns A dynamic asset form component
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

  const [name, setName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState(assetTypeId ?? "");
  const [status, setStatus] = useState("ordered");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);

  // Financial fields
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [costCenter, setCostCenter] = useState("");
  const [costType, setCostType] = useState<string>("");
  const [depreciationMethod, setDepreciationMethod] = useState<string>("");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<string>("");
  const [salvageValue, setSalvageValue] = useState<string>("");
  const [warrantyStart, setWarrantyStart] = useState<string>("");
  const [warrantyEnd, setWarrantyEnd] = useState<string>("");
  const [warrantyProvider, setWarrantyProvider] = useState("");

  const createMutation = trpc.asset.createAsset.useMutation();
  const updateMutation = trpc.asset.updateAsset.useMutation();
  const setFinancialsMutation = trpc.asset.setAssetFinancials.useMutation();

  const { data: existingAsset } = trpc.asset.getAsset.useQuery(
    { id: assetId ?? "" },
    { enabled: Boolean(assetId) },
  );

  const { data: assetTypes } = trpc.asset.listAssetTypes.useQuery();

  const { data: attrDefinitions } = trpc.asset.listAttributeDefinitions.useQuery(
    { assetTypeId: selectedTypeId },
    { enabled: Boolean(selectedTypeId) },
  );

  useEffect(() => {
    if (existingAsset) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existingAsset as any;
      setName(data.name ?? "");
      setSelectedTypeId(data.assetTypeId ?? "");
      setStatus(data.status ?? "ordered");
      setAttributes(data.attributes ?? {});
    }
  }, [existingAsset]);

  const updateAttribute = useCallback((key: string, value: unknown) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveFinancials = useCallback(async (targetAssetId: string) => {
    const hasFinancialData =
      purchasePrice || purchaseDate || costCenter || costType ||
      depreciationMethod || usefulLifeMonths || salvageValue ||
      warrantyStart || warrantyEnd || warrantyProvider;

    if (!hasFinancialData) return;

    await setFinancialsMutation.mutateAsync({
      assetId: targetAssetId,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      purchaseCurrency: purchaseCurrency || "USD",
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      costCenter: costCenter || null,
      costType: (costType as "capex" | "opex") || null,
      depreciationMethod: (depreciationMethod as "straight_line" | "declining_balance") || null,
      usefulLifeMonths: usefulLifeMonths ? Number(usefulLifeMonths) : null,
      salvageValue: salvageValue ? Number(salvageValue) : null,
      warrantyStart: warrantyStart ? new Date(warrantyStart) : null,
      warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : null,
      warrantyProvider: warrantyProvider || null,
    });
  }, [
    purchasePrice, purchaseDate, purchaseCurrency, costCenter, costType,
    depreciationMethod, usefulLifeMonths, salvageValue, warrantyStart,
    warrantyEnd, warrantyProvider, setFinancialsMutation,
  ]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (isEdit && assetId) {
        await updateMutation.mutateAsync({
          id: assetId,
          name,
          status: status as typeof ASSET_STATUSES[number],
          attributes,
        });
        await saveFinancials(assetId);
      } else {
        const created = await createMutation.mutateAsync({
          assetTypeId: selectedTypeId,
          name,
          status: status as typeof ASSET_STATUSES[number],
          attributes,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await saveFinancials((created as any).id);
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
    saveFinancials,
    onSave,
  ]);

  const definitions = attrDefinitions ?? [];

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
              {(assetTypes ?? []).map((at) => (
                <SelectItem key={at.id} value={at.id}>
                  {at.icon && <span className="mr-1">{at.icon}</span>}
                  {at.name}
                </SelectItem>
              ))}
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
              {ASSET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status_${s}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dynamic typed attribute fields */}
      {definitions.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("additionalProperties")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {definitions.map((def) => (
                <DynamicField
                  key={def.id}
                  definition={def}
                  value={attributes[def.name]}
                  onChange={(val) => updateAttribute(def.name, val)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Financial Details (collapsible) */}
      <Separator />
      <Collapsible open={financialOpen} onOpenChange={setFinancialOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 font-semibold">
            {financialOpen ? "−" : "+"} {t("financial_details")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 px-1 pt-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="purchase-price">{t("purchase_price")}</Label>
              <Input
                id="purchase-price"
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase-date">{t("purchase_date")}</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase-currency">{t("currency")}</Label>
              <Input
                id="purchase-currency"
                value={purchaseCurrency}
                onChange={(e) => setPurchaseCurrency(e.target.value)}
                placeholder="USD"
                maxLength={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost-center">{t("cost_center")}</Label>
              <Input
                id="cost-center"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder={t("cost_center_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("cost_type")}</Label>
              <Select value={costType} onValueChange={setCostType}>
                <SelectTrigger aria-label={t("cost_type")}>
                  <SelectValue placeholder={t("cost_type_select")} />
                </SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {t(`cost_type_${ct}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("depreciation_method")}</Label>
              <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
                <SelectTrigger aria-label={t("depreciation_method")}>
                  <SelectValue placeholder={t("depreciation_select")} />
                </SelectTrigger>
                <SelectContent>
                  {DEPRECIATION_METHODS.map((dm) => (
                    <SelectItem key={dm} value={dm}>
                      {t(`depreciation_${dm}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="useful-life">{t("useful_life")}</Label>
              <Input
                id="useful-life"
                type="number"
                min="1"
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value)}
                placeholder={t("useful_life_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salvage-value">{t("salvage_value")}</Label>
              <Input
                id="salvage-value"
                type="number"
                min="0"
                step="0.01"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warranty-start">{t("warranty_start")}</Label>
              <Input
                id="warranty-start"
                type="date"
                value={warrantyStart}
                onChange={(e) => setWarrantyStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warranty-end">{t("warranty_end")}</Label>
              <Input
                id="warranty-end"
                type="date"
                value={warrantyEnd}
                onChange={(e) => setWarrantyEnd(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="warranty-provider">{t("warranty_provider")}</Label>
              <Input
                id="warranty-provider"
                value={warrantyProvider}
                onChange={(e) => setWarrantyProvider(e.target.value)}
                placeholder={t("warranty_provider_placeholder")}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
 * Renders a form field based on the typed attribute definition.
 */
function DynamicField({
  definition,
  value,
  onChange,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definition: any;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const fieldId = `asset-field-${definition.name}`;

  switch (definition.fieldType) {
    case "text":
    case "url":
    case "ipAddress":
    case "reference":
    case "user":
      return (
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>
            {definition.label}
            {definition.isRequired && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={fieldId}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={definition.isRequired}
          />
        </div>
      );

    case "number":
      return (
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>
            {definition.label}
            {definition.isRequired && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={String(value ?? "")}
            onChange={(e) => onChange(Number(e.target.value))}
            required={definition.isRequired}
          />
        </div>
      );

    case "date":
      return (
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>
            {definition.label}
            {definition.isRequired && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={fieldId}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={definition.isRequired}
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
          <Label htmlFor={fieldId}>{definition.label}</Label>
        </div>
      );

    case "select": {
      const options: string[] = Array.isArray(definition.options) ? definition.options : [];
      return (
        <div className="grid gap-2">
          <Label>{definition.label}</Label>
          <Select
            value={String(value ?? "")}
            onValueChange={onChange}
          >
            <SelectTrigger aria-label={definition.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    default:
      return (
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>{definition.label}</Label>
          <Textarea
            id={fieldId}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
          />
        </div>
      );
  }
}

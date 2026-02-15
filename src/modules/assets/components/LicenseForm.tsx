"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
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
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/shared/components/responsive-dialog";
import { trpc } from "@/shared/lib/trpc";
import { LICENSE_TYPES, LICENSE_STATUSES } from "../types/schemas";

interface LicenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId?: string;
  onSuccess?: () => void;
}

/**
 * LicenseForm renders a create/edit form in a ResponsiveDialog
 * for software license management.
 *
 * @param props - LicenseFormProps
 * @returns The license form dialog component
 */
export function LicenseForm({ open, onOpenChange, licenseId, onSuccess }: LicenseFormProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const isEdit = Boolean(licenseId);

  // Fetch existing license data if editing
  const { data: existingLicense } = trpc.asset.getLicense.useQuery(
    { id: licenseId! },
    { enabled: isEdit },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = existingLicense as any;

  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [licenseType, setLicenseType] = useState<string>("subscription");
  const [licenseKey, setLicenseKey] = useState("");
  const [totalEntitlements, setTotalEntitlements] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalCost, setRenewalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("active");

  // Populate form when editing
  useState(() => {
    if (existing) {
      setName(existing.name ?? "");
      setVendor(existing.vendor ?? "");
      setLicenseType(existing.licenseType ?? "subscription");
      setLicenseKey(existing.licenseKey ?? "");
      setTotalEntitlements(String(existing.totalEntitlements ?? 1));
      setPurchasePrice(existing.purchasePrice ? String(Number(existing.purchasePrice)) : "");
      setCurrency(existing.currency ?? "USD");
      setPurchaseDate(existing.purchaseDate ? new Date(existing.purchaseDate).toISOString().split("T")[0]! : "");
      setRenewalDate(existing.renewalDate ? new Date(existing.renewalDate).toISOString().split("T")[0]! : "");
      setExpirationDate(existing.expirationDate ? new Date(existing.expirationDate).toISOString().split("T")[0]! : "");
      setAutoRenew(existing.autoRenew ?? false);
      setRenewalCost(existing.renewalCost ? String(Number(existing.renewalCost)) : "");
      setNotes(existing.notes ?? "");
      setStatus(existing.status ?? "active");
    }
  });

  const createMutation = trpc.asset.createLicense.useMutation({
    onSuccess: () => {
      utils.asset.listLicenses.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = trpc.asset.updateLicense.useMutation({
    onSuccess: () => {
      utils.asset.listLicenses.invalidate();
      utils.asset.getLicense.invalidate({ id: licenseId! });
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      vendor: vendor || null,
      licenseType: licenseType as typeof LICENSE_TYPES[number],
      licenseKey: licenseKey || null,
      totalEntitlements: parseInt(totalEntitlements, 10) || 1,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      currency,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      autoRenew,
      renewalCost: renewalCost ? parseFloat(renewalCost) : null,
      notes: notes || null,
      status: status as typeof LICENSE_STATUSES[number],
    };

    if (isEdit && licenseId) {
      updateMutation.mutate({ id: licenseId, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEdit ? t("license_edit") : t("license_create")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEdit ? t("license_edit_description") : t("license_create_description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license-name">{t("name")}</Label>
            <Input
              id="license-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("license_name_placeholder")}
              required
              maxLength={255}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license-vendor">{t("license_vendor")}</Label>
              <Input
                id="license-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder={t("license_vendor_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-type">{t("license_type")}</Label>
              <Select value={licenseType} onValueChange={setLicenseType}>
                <SelectTrigger id="license-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {t(`license_type_${lt}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-key">{t("license_key")}</Label>
            <Input
              id="license-key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder={t("license_key_placeholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license-entitlements">{t("entitlements_total")}</Label>
              <Input
                id="license-entitlements"
                type="number"
                min={1}
                value={totalEntitlements}
                onChange={(e) => setTotalEntitlements(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-status">{t("status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="license-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`license_status_${s}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license-purchase-price">{t("license_purchase_price")}</Label>
              <Input
                id="license-purchase-price"
                type="number"
                min={0}
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-currency">{t("license_currency")}</Label>
              <Input
                id="license-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license-purchase-date">{t("purchaseDate")}</Label>
              <Input
                id="license-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-expiration-date">{t("expiration_date")}</Label>
              <Input
                id="license-expiration-date"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license-renewal-date">{t("renewal_date")}</Label>
              <Input
                id="license-renewal-date"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-renewal-cost">{t("renewal_cost")}</Label>
              <Input
                id="license-renewal-cost"
                type="number"
                min={0}
                step="0.01"
                value={renewalCost}
                onChange={(e) => setRenewalCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="license-auto-renew"
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
            <Label htmlFor="license-auto-renew">{t("license_auto_renew")}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-notes">{t("notes")}</Label>
            <Textarea
              id="license-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={3}
            />
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

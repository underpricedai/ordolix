"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/shared/components/responsive-dialog";
import { trpc } from "@/shared/lib/trpc";

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string;
  onSuccess?: () => void;
}

/**
 * VendorForm renders a create/edit form in a ResponsiveDialog
 * for vendor management.
 *
 * @param props - VendorFormProps
 * @returns The vendor form dialog component
 */
export function VendorForm({ open, onOpenChange, vendorId, onSuccess }: VendorFormProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const isEdit = Boolean(vendorId);

  // Fetch existing vendor data if editing
  const { data: existingVendor } = trpc.vendor.getVendor.useQuery(
    { id: vendorId! },
    { enabled: isEdit },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = existingVendor as any;

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Populate form when editing
  useState(() => {
    if (existing) {
      setName(existing.name ?? "");
      setContactName(existing.contactName ?? "");
      setContactEmail(existing.contactEmail ?? "");
      setContactPhone(existing.contactPhone ?? "");
      setWebsite(existing.website ?? "");
      setAddress(existing.address ?? "");
      setIsActive(existing.isActive ?? true);
    }
  });

  const createMutation = trpc.vendor.createVendor.useMutation({
    onSuccess: () => {
      utils.vendor.listVendors.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = trpc.vendor.updateVendor.useMutation({
    onSuccess: () => {
      utils.vendor.listVendors.invalidate();
      utils.vendor.getVendor.invalidate({ id: vendorId! });
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      website: website || null,
      address: address || null,
      isActive,
    };

    if (isEdit && vendorId) {
      updateMutation.mutate({ id: vendorId, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEdit ? t("vendor_edit") : t("vendor_create")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEdit ? t("vendor_edit_description") : t("vendor_create_description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">{t("name")}</Label>
            <Input
              id="vendor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vendor_name_placeholder")}
              required
              maxLength={255}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-contact-name">{t("vendor_contact_name")}</Label>
              <Input
                id="vendor-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("vendor_contact_name_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-contact-email">{t("vendor_contact_email")}</Label>
              <Input
                id="vendor-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("vendor_contact_email_placeholder")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-contact-phone">{t("vendor_contact_phone")}</Label>
              <Input
                id="vendor-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t("vendor_contact_phone_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-website">{t("vendor_website")}</Label>
              <Input
                id="vendor-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t("vendor_website_placeholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-address">{t("vendor_address")}</Label>
            <Textarea
              id="vendor-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("vendor_address_placeholder")}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="vendor-is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="vendor-is-active">{t("vendor_active")}</Label>
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

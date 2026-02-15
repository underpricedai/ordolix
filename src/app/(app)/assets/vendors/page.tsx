"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { VendorList } from "@/modules/assets/components/VendorList";
import { VendorForm } from "@/modules/assets/components/VendorForm";

/**
 * Vendors page with list and create form.
 *
 * @description Displays a vendor management table by default.
 * Includes a create dialog for adding new vendors.
 */
export default function VendorsPage() {
  const t = useTranslations("assets");
  const tn = useTranslations("nav");

  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <>
      <AppHeader
        breadcrumbs={[
          {
            label: tn("assets"),
            href: "/assets",
          },
          {
            label: t("vendors"),
          },
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("vendors")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("vendor_page_description")}
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("vendor_create")}
          </Button>
        </div>
        <VendorList
          onCreateVendor={() => setShowCreateForm(true)}
        />
      </div>
      <VendorForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </>
  );
}

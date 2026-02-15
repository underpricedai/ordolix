"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { LicenseList } from "@/modules/assets/components/LicenseList";
import { LicenseDetail } from "@/modules/assets/components/LicenseDetail";
import { LicenseForm } from "@/modules/assets/components/LicenseForm";

/**
 * Licenses page with list and detail views.
 *
 * @description Displays a software license inventory table by default.
 * Clicking a license navigates to its full detail view with compliance
 * info and allocations.
 */
export default function LicensesPage() {
  const t = useTranslations("assets");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
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
            label: t("licenses"),
            href: selectedLicenseId ? "/assets/licenses" : undefined,
          },
          ...(selectedLicenseId ? [{ label: tc("details") }] : []),
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {selectedLicenseId ? (
          <LicenseDetail
            licenseId={selectedLicenseId}
            onBack={() => setSelectedLicenseId(null)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("licenses")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("license_page_description")}
                </p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("license_create")}
              </Button>
            </div>
            <LicenseList
              onSelectLicense={setSelectedLicenseId}
              onCreateLicense={() => setShowCreateForm(true)}
            />
          </>
        )}
      </div>
      <LicenseForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </>
  );
}

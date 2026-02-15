/**
 * Admin SailPoint integration page.
 *
 * Provides configuration, mapping management, and sync log viewing
 * for the SailPoint IdentityNow integration.
 *
 * @module admin-integrations-sailpoint
 */
"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { SailPointConfigPanel } from "@/integrations/sailpoint/components/SailPointConfigPanel";
import { SailPointMappingList } from "@/integrations/sailpoint/components/SailPointMappingList";
import { SailPointMappingForm } from "@/integrations/sailpoint/components/SailPointMappingForm";
import { SailPointSyncLogViewer } from "@/integrations/sailpoint/components/SailPointSyncLogViewer";
import { trpc } from "@/shared/lib/trpc";

export default function AdminSailPointPage() {
  const t = useTranslations("integrations.sailpoint");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();

  function handleMappingCreated() {
    void utils.sailpoint.listMappings.invalidate();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header with back link */}
      <div className="flex items-center gap-4">
        <Link href="/admin/integrations">
          <Button variant="ghost" size="icon" aria-label={tc("back")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <section aria-labelledby="sailpoint-config-heading">
        <SailPointConfigPanel />
      </section>

      {/* Mappings Section */}
      <section aria-labelledby="sailpoint-mappings-heading" className="space-y-4">
        <SailPointMappingForm onSuccess={handleMappingCreated} />
        <SailPointMappingList />
      </section>

      {/* Sync Logs Section */}
      <section aria-labelledby="sailpoint-logs-heading">
        <SailPointSyncLogViewer />
      </section>
    </div>
  );
}

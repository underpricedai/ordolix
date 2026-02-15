/**
 * Admin Omnea integration configuration and management page.
 *
 * @description Provides configuration for the Omnea integration,
 * displays mapping status, and allows triggering full syncs.
 *
 * @module admin-integrations-omnea
 */
"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { OmneaConfigPanel } from "@/integrations/omnea/components/OmneaConfigPanel";
import { OmneaMappingList } from "@/integrations/omnea/components/OmneaMappingList";
import { OmneaSyncButton } from "@/integrations/omnea/components/OmneaSyncButton";
import { trpc } from "@/shared/lib/trpc";

export default function AdminOmneaPage() {
  const t = useTranslations("integrations.omnea");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  function handleSyncComplete() {
    void utils.omnea.listMappings.invalidate();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/integrations">
            <ArrowLeft className="me-2 size-4" aria-hidden="true" />
            {tc("back")}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <OmneaSyncButton onComplete={handleSyncComplete} />
      </div>

      {/* Configuration panel */}
      <OmneaConfigPanel />

      {/* Mapping list */}
      <OmneaMappingList />
    </div>
  );
}

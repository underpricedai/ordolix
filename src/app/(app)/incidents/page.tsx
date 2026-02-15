"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { IncidentList } from "@/modules/incidents/components/IncidentList";
import { IncidentDetail } from "@/modules/incidents/components/IncidentDetail";

/**
 * Incidents page with list and detail views.
 *
 * @description Displays an incident tracker table by default. Clicking an
 * incident navigates to its full detail view with timeline, linked issues,
 * and editable root cause / resolution fields.
 */
export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );

  return (
    <>
      <AppHeader
        breadcrumbs={[
          {
            label: tn("incidents"),
            href: selectedIncidentId ? "/incidents" : undefined,
          },
          ...(selectedIncidentId ? [{ label: tc("details") }] : []),
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {selectedIncidentId ? (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onBack={() => setSelectedIncidentId(null)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createIncident")}
              </Button>
            </div>
            <IncidentList onSelectIncident={setSelectedIncidentId} />
          </>
        )}
      </div>
    </>
  );
}

/**
 * Survey statistics and reporting dashboard page.
 *
 * @description Displays aggregate CSAT metrics, charts, and agent
 * performance data using the SurveyStatsPanel component.
 *
 * @module surveys-stats
 */
"use client";

import { useTranslations } from "next-intl";
import { SurveyStatsPanel } from "@/modules/surveys/components/SurveyStatsPanel";

export default function SurveyStatsPage() {
  const t = useTranslations("surveys");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("statsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("statsDescription")}</p>
      </div>

      <SurveyStatsPanel />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { ScriptList } from "@/modules/scripts/components/ScriptList";
import { ScriptEditor } from "@/modules/scripts/components/ScriptEditor";

/**
 * Scripts page with library list and code editor views.
 *
 * @description Displays the script library table by default. Clicking a script
 * opens the code editor. Includes a create button for new scripts.
 */
export default function ScriptsPage() {
  const t = useTranslations("scripts");
  const tn = useTranslations("nav");

  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <>
      <AppHeader
        breadcrumbs={[
          {
            label: tn("scripts"),
            href: activeScriptId || isCreating ? "/scripts" : undefined,
          },
          ...(activeScriptId
            ? [{ label: t("editScript") }]
            : isCreating
              ? [{ label: t("createScript") }]
              : []),
        ]}
      />
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {activeScriptId || isCreating ? (
          <ScriptEditor
            scriptId={activeScriptId ?? undefined}
            onSave={() => {
              setActiveScriptId(null);
              setIsCreating(false);
            }}
            onBack={() => {
              setActiveScriptId(null);
              setIsCreating(false);
            }}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createScript")}
              </Button>
            </div>
            <ScriptList onSelectScript={setActiveScriptId} />
          </>
        )}
      </div>
    </>
  );
}

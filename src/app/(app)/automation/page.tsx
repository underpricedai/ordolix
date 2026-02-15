"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { AutomationRuleList } from "@/modules/automation/components/AutomationRuleList";
import { AutomationRuleEditor } from "@/modules/automation/components/AutomationRuleEditor";

/**
 * Automation page for managing automation rules.
 *
 * @description Shows a list of automation rules with the ability to create
 * and edit rules. Toggles between list view and editor view.
 */
export default function AutomationPage() {
  const tn = useTranslations("nav");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const showEditor = creating || editingRuleId !== null;

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("automation") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {showEditor ? (
          <AutomationRuleEditor
            ruleId={editingRuleId ?? undefined}
            onSuccess={() => {
              setCreating(false);
              setEditingRuleId(null);
            }}
            onCancel={() => {
              setCreating(false);
              setEditingRuleId(null);
            }}
          />
        ) : (
          <AutomationRuleList
            onCreateRule={() => setCreating(true)}
            onEditRule={(id) => setEditingRuleId(id)}
          />
        )}
      </div>
    </>
  );
}

/**
 * Admin survey template management page.
 *
 * @description Displays a list of survey templates with actions to create,
 * edit, activate/deactivate, and delete. Opens a dialog form for CRUD.
 *
 * @module admin-surveys
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Inbox } from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { SurveyTemplateList } from "@/modules/surveys/components/SurveyTemplateList";
import { SurveyTemplateForm } from "@/modules/surveys/components/SurveyTemplateForm";

interface EditingTemplate {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  isActive: boolean;
  delayMinutes: number;
  questions: unknown;
}

export default function AdminSurveysPage() {
  const t = useTranslations("surveys");

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);

  const { data: templates } = trpc.survey.listTemplates.useQuery();

  function handleEdit(template: EditingTemplate) {
    setEditingTemplate(template);
    setFormOpen(true);
  }

  function handleOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingTemplate(null);
  }

  const isEmpty = templates && templates.length === 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("adminTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("adminDescription")}</p>
        </div>

        <Button onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t("createTemplate")}
        </Button>
      </div>

      {/* Template list or empty state */}
      {isEmpty ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noTemplates")}
          description={t("noTemplatesDescription")}
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createTemplate")}
            </Button>
          }
        />
      ) : (
        <SurveyTemplateList onEdit={handleEdit} />
      )}

      {/* Create/Edit dialog */}
      <SurveyTemplateForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}

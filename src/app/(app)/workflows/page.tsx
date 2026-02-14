"use client";

import { useTranslations } from "next-intl";
import { AppHeader } from "@/shared/components/app-header";
import { WorkflowEditor } from "@/modules/workflows/components/WorkflowEditor";

/**
 * Workflows page with the visual workflow editor.
 *
 * @description Displays the WorkflowEditor for the currently active project's
 * workflow. The editor allows viewing and editing statuses, transitions,
 * validators, and conditions in a visual SVG canvas.
 */
export default function WorkflowsPage() {
  const tn = useTranslations("nav");
  const t = useTranslations("workflows");

  // In production, projectId would come from route params or project context
  const projectId = "default";

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: tn("workflows") },
        ]}
      />
      <div className="flex flex-1 flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
        </div>

        {/* Workflow editor */}
        <div className="flex-1">
          <WorkflowEditor
            projectId={projectId}
            className="h-[calc(100vh-12rem)]"
          />
        </div>
      </div>
    </>
  );
}

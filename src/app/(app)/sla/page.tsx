"use client";

import { useTranslations } from "next-intl";
import { Plus, Settings } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SLADashboard } from "@/modules/sla/components/SLADashboard";
import { SLAConfigForm } from "@/modules/sla/components/SLAConfigForm";

/**
 * SLA management page with dashboard and configuration views.
 *
 * @description Shows SLA health dashboard with active instances and
 * a configuration tab for creating/editing SLA policies.
 */
export default function SLAPage() {
  const t = useTranslations("sla");
  const tn = useTranslations("nav");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("sla") }]} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor SLA compliance and configure policies.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createSla")}
          </Button>
        </div>

        {/* Tab views */}
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="mr-1 size-3.5" aria-hidden="true" />
              Configuration
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <SLADashboard />
          </TabsContent>
          <TabsContent value="config" className="mt-4">
            <SLAConfigForm />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

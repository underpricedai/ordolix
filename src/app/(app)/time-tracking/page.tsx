"use client";

import { useTranslations } from "next-intl";
import { List, Grid3X3 } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TimeLogForm } from "@/modules/time-tracking/components/TimeLogForm";
import { TimeLogList } from "@/modules/time-tracking/components/TimeLogList";
import { TimesheetView } from "@/modules/time-tracking/components/TimesheetView";

/**
 * Time Tracking page with list and timesheet views.
 *
 * @description Displays time log entries with a toggle between list view
 * and weekly timesheet grid. Includes a log time button.
 */
export default function TimeTrackingPage() {
  const t = useTranslations("timeTracking");
  const tn = useTranslations("nav");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("timeTracking") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage time spent across your projects.
            </p>
          </div>
          <TimeLogForm />
        </div>

        {/* Tab views */}
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">
              <List className="mr-1 size-3.5" aria-hidden="true" />
              List
            </TabsTrigger>
            <TabsTrigger value="timesheet">
              <Grid3X3 className="mr-1 size-3.5" aria-hidden="true" />
              Timesheet
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <TimeLogList />
          </TabsContent>
          <TabsContent value="timesheet" className="mt-4">
            <TimesheetView />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

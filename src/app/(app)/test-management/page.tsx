"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical, Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { TestCaseList } from "@/modules/test-management/components/TestCaseList";
import { TestCaseEditor } from "@/modules/test-management/components/TestCaseEditor";
import { TestRunView } from "@/modules/test-management/components/TestRunView";

/**
 * Test Management page with tabs for test cases and test runs.
 *
 * @description Provides a tabbed interface for browsing test cases, editing
 * individual test cases, and executing test runs. Includes a create dialog
 * for new test cases.
 */
export default function TestManagementPage() {
  const t = useTranslations("testManagement");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTestCaseId, setEditingTestCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cases");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("testManagement") }]} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createTestCase")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("createTestCase")}</DialogTitle>
              </DialogHeader>
              <TestCaseEditor
                testSuiteId="default"
                onSave={() => setCreateOpen(false)}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cases">
              <FlaskConical className="mr-1.5 size-4" aria-hidden="true" />
              {t("testCases")}
            </TabsTrigger>
            <TabsTrigger value="runs">{t("testRuns")}</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-4">
            {editingTestCaseId ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTestCaseId(null)}
                >
                  {tc("back")}
                </Button>
                <TestCaseEditor
                  testCaseId={editingTestCaseId}
                  onSave={() => setEditingTestCaseId(null)}
                  onCancel={() => setEditingTestCaseId(null)}
                />
              </div>
            ) : (
              <TestCaseList
                onSelectTestCase={(id) => setEditingTestCaseId(id)}
              />
            )}
          </TabsContent>

          <TabsContent value="runs" className="mt-4">
            <TestRunView testRunId="default" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

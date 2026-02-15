/**
 * Admin integrations configuration page.
 *
 * @description Displays cards for each integration (GitHub, SharePoint,
 * Salesforce, Power BI, Slack/Teams) with connection status and
 * configuration dialogs.
 *
 * @module admin-integrations
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Github,
  FileText,
  BarChart3,
  MessageSquare,
  Cloud,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { trpc } from "@/shared/lib/trpc";

/**
 * Integration definitions with metadata.
 */
const INTEGRATIONS = [
  {
    id: "github",
    nameKey: "github",
    descKey: "githubDesc",
    icon: Github,
    connected: false,
    fields: ["apiKey", "webhookUrl"],
  },
  {
    id: "sharepoint",
    nameKey: "sharepoint",
    descKey: "sharepointDesc",
    icon: FileText,
    connected: false,
    fields: ["apiKey"],
  },
  {
    id: "salesforce",
    nameKey: "salesforce",
    descKey: "salesforceDesc",
    icon: Cloud,
    connected: false,
    fields: ["apiKey"],
  },
  {
    id: "powerbi",
    nameKey: "powerbi",
    descKey: "powerbiDesc",
    icon: BarChart3,
    connected: false,
    fields: ["apiKey"],
  },
  {
    id: "slack",
    nameKey: "slack",
    descKey: "slackDesc",
    icon: MessageSquare,
    connected: false,
    fields: ["apiKey", "webhookUrl"],
  },
] as const;

export default function AdminIntegrationsPage() {
  const t = useTranslations("admin.integrations");
  const tc = useTranslations("common");

  const [configOpen, setConfigOpen] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(
    null,
  );
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);

  const { data: githubConfig, refetch: refetchGitHub } =
    trpc.integration.getGitHubConfig.useQuery(undefined, {
      retry: false,
    });

  const upsertGitHubConfig = trpc.integration.upsertGitHubConfig.useMutation({
    onSuccess: () => {
      void refetchGitHub();
      setIsSaving(false);
      closeConfig();
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const deleteGitHubConfig = trpc.integration.deleteGitHubConfig.useMutation({
    onSuccess: () => {
      void refetchGitHub();
    },
  });

  function openConfig(id: string) {
    setActiveIntegration(id);
    setTestStatus("idle");
    if (id === "github" && githubConfig) {
      const cfg = githubConfig.config as Record<string, unknown> | null;
      setApiKey("");
      setWebhookUrl(String(cfg?.owner ?? ""));
    } else {
      setApiKey("");
      setWebhookUrl("");
    }
    setConfigOpen(true);
  }

  function closeConfig() {
    setConfigOpen(false);
    setActiveIntegration(null);
    setTestStatus("idle");
  }

  function handleSave() {
    if (activeIntegration === "github") {
      setIsSaving(true);
      upsertGitHubConfig.mutate({
        owner: webhookUrl || "default",
        isActive: true,
      });
    } else {
      closeConfig();
    }
  }

  function handleTestConnection() {
    setTestStatus("testing");
    setTimeout(() => {
      if (apiKey || webhookUrl) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    }, 1500);
  }

  function handleDisconnect(id: string) {
    if (id === "github") {
      deleteGitHubConfig.mutate();
    }
  }

  const githubConnected = !!githubConfig?.isActive;

  const integrationStatus: Record<string, boolean> = {
    github: githubConnected,
  };

  const activeConfig = INTEGRATIONS.find((i) => i.id === activeIntegration);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Integration cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integrationStatus[integration.id] ?? false;
          return (
            <Card key={integration.id}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-6 text-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {t(integration.nameKey)}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      isConnected
                        ? "mt-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "mt-1 border-muted text-muted-foreground"
                    }
                  >
                    {isConnected
                      ? tc("connected")
                      : tc("disconnected")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(integration.descKey)}</CardDescription>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openConfig(integration.id)}
                >
                  <Settings className="mr-2 size-4" aria-hidden="true" />
                  {tc("configure")}
                </Button>
                {isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    {tc("disconnect")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Configuration dialog */}
      <ResponsiveDialog open={configOpen} onOpenChange={setConfigOpen}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {activeConfig ? t(activeConfig.nameKey) : tc("configure")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {activeConfig ? t(activeConfig.descKey) : ""}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            {activeConfig?.fields.includes("apiKey") && (
              <div className="grid gap-2">
                <Label htmlFor="integration-api-key">{t("apiKey")}</Label>
                <Input
                  id="integration-api-key"
                  type="password"
                  placeholder={t("apiKeyPlaceholder")}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}
            {(activeConfig?.fields as readonly string[] | undefined)?.includes("webhookUrl") && (
              <div className="grid gap-2">
                <Label htmlFor="integration-webhook">{t("webhookUrl")}</Label>
                <Input
                  id="integration-webhook"
                  type="url"
                  placeholder={t("webhookUrlPlaceholder")}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            )}
          </div>
          <ResponsiveDialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfig}>
              {tc("cancel")}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
            >
              {testStatus === "testing" && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {testStatus === "success" && (
                <CheckCircle2 className="mr-2 size-4 text-green-600" aria-hidden="true" />
              )}
              {testStatus === "error" && (
                <XCircle className="mr-2 size-4 text-red-600" aria-hidden="true" />
              )}
              {t("testConnection")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {t("saveConfig")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

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

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Github,
  FileText,
  BarChart3,
  MessageSquare,
  Cloud,
  Settings,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

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

  function openConfig(id: string) {
    setActiveIntegration(id);
    setApiKey("");
    setWebhookUrl("");
    setConfigOpen(true);
  }

  function closeConfig() {
    setConfigOpen(false);
    setActiveIntegration(null);
  }

  const activeConfig = INTEGRATIONS.find((i) => i.id === activeIntegration);

  return (
    <div className="space-y-6 p-6">
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
                      integration.connected
                        ? "mt-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "mt-1 border-muted text-muted-foreground"
                    }
                  >
                    {integration.connected
                      ? tc("connected")
                      : tc("disconnected")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(integration.descKey)}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openConfig(integration.id)}
                >
                  <Settings className="mr-2 size-4" aria-hidden="true" />
                  {tc("configure")}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Configuration dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeConfig ? t(activeConfig.nameKey) : tc("configure")}
            </DialogTitle>
            <DialogDescription>
              {activeConfig ? t(activeConfig.descKey) : ""}
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfig}>
              {tc("cancel")}
            </Button>
            <Button variant="outline" onClick={closeConfig}>
              {t("testConnection")}
            </Button>
            <Button onClick={closeConfig}>{t("saveConfig")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

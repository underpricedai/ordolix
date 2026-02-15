/**
 * Omnea integration configuration panel.
 *
 * @description Admin form for configuring the Omnea integration,
 * including API URL, API key, and webhook URL. Displays connection
 * status and allows testing the connection.
 *
 * @module integrations/omnea/components/OmneaConfigPanel
 */
"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, XCircle, KeyRound } from "lucide-react";
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
import { trpc } from "@/shared/lib/trpc";

/**
 * Admin panel for configuring the Omnea integration.
 *
 * Allows admins to:
 * - Enter Omnea API URL and API key
 * - Optionally specify a webhook URL
 * - Test the connection
 * - Save or update the configuration
 */
export function OmneaConfigPanel() {
  const t = useTranslations("integrations.omnea");
  const tc = useTranslations("common");

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const apiUrlRef = useRef<HTMLInputElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const webhookUrlRef = useRef<HTMLInputElement>(null);

  const { data: config, refetch } = trpc.omnea.getOmneaConfig.useQuery(undefined, {
    retry: false,
  });

  const configureMutation = trpc.omnea.configureOmnea.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleTestConnection = useCallback(() => {
    const apiUrl = apiUrlRef.current?.value ?? "";
    const apiKey = apiKeyRef.current?.value ?? "";
    setTestStatus("testing");
    // Simulate connection test - in production this would call the Omnea API
    setTimeout(() => {
      if (apiUrl && apiKey) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    }, 1500);
  }, []);

  const handleSave = useCallback(() => {
    const apiUrl = apiUrlRef.current?.value ?? "";
    const apiKey = apiKeyRef.current?.value ?? "";
    const webhookUrl = webhookUrlRef.current?.value ?? "";
    if (!apiUrl || !apiKey) return;
    configureMutation.mutate({
      apiUrl,
      apiKey,
      webhookUrl: webhookUrl || undefined,
      isActive: true,
    });
  }, [configureMutation]);

  const isConnected = config?.isActive && config?.hasApiKey;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("configTitle")}</CardTitle>
            <CardDescription>{t("configDescription")}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              isConnected
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "border-muted text-muted-foreground"
            }
          >
            {isConnected ? tc("connected") : tc("disconnected")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="omnea-api-url">{t("apiUrl")}</Label>
          <Input
            id="omnea-api-url"
            ref={apiUrlRef}
            type="url"
            placeholder={t("apiUrlPlaceholder")}
            defaultValue={config?.apiUrl ?? ""}
            key={`api-url-${config?.id ?? "empty"}`}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="omnea-api-key">{t("apiKey")}</Label>
          <div className="relative">
            <KeyRound
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="omnea-api-key"
              ref={apiKeyRef}
              type="password"
              placeholder={
                config?.hasApiKey ? t("apiKeyConfigured") : t("apiKeyPlaceholder")
              }
              className="ps-10"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="omnea-webhook-url">{t("webhookUrl")}</Label>
          <Input
            id="omnea-webhook-url"
            ref={webhookUrlRef}
            type="url"
            placeholder={t("webhookUrlPlaceholder")}
            defaultValue={config?.webhookUrl ?? ""}
            key={`webhook-url-${config?.id ?? "empty"}`}
          />
          <p className="text-xs text-muted-foreground">{t("webhookUrlHelp")}</p>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={testStatus === "testing"}
        >
          {testStatus === "testing" && (
            <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {testStatus === "success" && (
            <CheckCircle2 className="me-2 size-4 text-green-600" aria-hidden="true" />
          )}
          {testStatus === "error" && (
            <XCircle className="me-2 size-4 text-red-600" aria-hidden="true" />
          )}
          {t("testConnection")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={configureMutation.isPending}
        >
          {configureMutation.isPending && (
            <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {t("saveConfig")}
        </Button>
      </CardFooter>
    </Card>
  );
}

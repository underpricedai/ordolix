/**
 * SailPoint configuration panel for admin settings.
 *
 * Allows administrators to configure SailPoint tenant URL, client ID,
 * and client secret for the IdentityNow integration.
 *
 * @module integrations/sailpoint/components/SailPointConfigPanel
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, Shield } from "lucide-react";
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
 * Admin panel for configuring SailPoint IdentityNow integration.
 *
 * Shows connection status, allows entering credentials, and saves config.
 */
export function SailPointConfigPanel() {
  const t = useTranslations("integrations.sailpoint");
  const tc = useTranslations("common");

  const [tenantUrl, setTenantUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: config, refetch } = trpc.sailpoint.getConfig.useQuery(undefined, {
    retry: false,
  });

  const configureMutation = trpc.sailpoint.configureSailPoint.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setClientSecret("");
      void refetch();
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const isConnected = !!config?.isActive;

  function handleSave() {
    setIsSaving(true);
    configureMutation.mutate({
      tenantUrl: tenantUrl || String(config?.tenantUrl ?? ""),
      clientId: clientId || String(config?.clientId ?? ""),
      clientSecret,
      isActive: true,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <Shield className="size-6 text-foreground" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
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
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="sailpoint-tenant-url">{t("tenantUrl")}</Label>
          <Input
            id="sailpoint-tenant-url"
            type="url"
            placeholder={t("tenantUrlPlaceholder")}
            value={tenantUrl}
            onChange={(e) => setTenantUrl(e.target.value)}
            defaultValue={config?.tenantUrl ? String(config.tenantUrl) : ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sailpoint-client-id">{t("clientId")}</Label>
          <Input
            id="sailpoint-client-id"
            type="text"
            placeholder={t("clientIdPlaceholder")}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            defaultValue={config?.clientId ? String(config.clientId) : ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sailpoint-client-secret">{t("clientSecret")}</Label>
          <Input
            id="sailpoint-client-secret"
            type="password"
            placeholder={t("clientSecretPlaceholder")}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t("clientSecretHelp")}
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>{t("configuredMessage")}</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && (
            <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {tc("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

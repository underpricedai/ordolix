/**
 * Omnea full sync trigger button.
 *
 * @description A button component that triggers a full sync between
 * Ordolix and Omnea. Shows sync progress and results.
 *
 * @module integrations/omnea/components/OmneaSyncButton
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { trpc } from "@/shared/lib/trpc";

interface SyncResult {
  synced: number;
  created: number;
  errors: number;
  total: number;
}

/**
 * Button that triggers a full Omnea sync.
 *
 * After sync completes, displays a summary of synced, created, and errored records.
 * Optionally calls onComplete callback to allow parent components to refresh data.
 *
 * @param props.onComplete - Optional callback invoked after sync completes
 */
export function OmneaSyncButton({ onComplete }: { onComplete?: () => void }) {
  const t = useTranslations("integrations.omnea");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const syncMutation = trpc.omnea.syncAll.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      onComplete?.();
    },
  });

  const handleSync = useCallback(() => {
    setSyncResult(null);
    syncMutation.mutate();
  }, [syncMutation]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSync}
        disabled={syncMutation.isPending}
        variant="outline"
      >
        <RefreshCw
          className={`me-2 size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {syncMutation.isPending ? t("syncing") : t("syncAll")}
      </Button>

      {syncResult && (
        <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
          {syncResult.errors > 0 ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="font-medium">{t("syncComplete")}</p>
            <p className="text-muted-foreground">
              {t("syncSummary", {
                total: syncResult.total,
                synced: syncResult.synced,
                created: syncResult.created,
                errors: syncResult.errors,
              })}
            </p>
          </div>
        </div>
      )}

      {syncMutation.isError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {t("syncError")}
        </div>
      )}
    </div>
  );
}

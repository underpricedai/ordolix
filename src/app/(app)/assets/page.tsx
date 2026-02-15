"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { AssetList } from "@/modules/assets/components/AssetList";
import { AssetDetail } from "@/modules/assets/components/AssetDetail";

/**
 * Assets page with list and detail views.
 *
 * @description Displays an asset inventory table by default. Clicking an
 * asset navigates to its full detail view with properties, relationships,
 * and change history.
 */
export default function AssetsPage() {
  const t = useTranslations("assets");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <>
      <AppHeader
        breadcrumbs={[
          {
            label: tn("assets"),
            href: selectedAssetId ? "/assets" : undefined,
          },
          ...(selectedAssetId ? [{ label: tc("details") }] : []),
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {selectedAssetId ? (
          <AssetDetail
            assetId={selectedAssetId}
            onBack={() => setSelectedAssetId(null)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createAsset")}
              </Button>
            </div>
            <AssetList onSelectAsset={setSelectedAssetId} />
          </>
        )}
      </div>
    </>
  );
}

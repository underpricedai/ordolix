/**
 * ExportDialog component.
 *
 * @description Dialog with asset type selector, optional status filter,
 * optional search. "Export" button triggers CSV download. "Download Template"
 * button gets an empty CSV template.
 *
 * @module ExportDialog
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { trpc } from "@/shared/lib/trpc";
import { ASSET_STATUSES } from "../types/schemas";

interface ExportDialogProps {
  /** Optional trigger element; uses default button if not provided */
  trigger?: React.ReactNode;
}

/**
 * ExportDialog renders a dialog for exporting assets to CSV or
 * downloading an empty CSV template.
 *
 * @param props - ExportDialogProps
 * @returns Export dialog component
 */
export function ExportDialog({ trigger }: ExportDialogProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [assetTypeId, setAssetTypeId] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: assetTypes } = trpc.asset.listAssetTypes.useQuery();

  const exportQuery = trpc.asset.exportAssets.useQuery(
    {
      assetTypeId,
      ...(status !== "all" ? { status: status as typeof ASSET_STATUSES[number] } : {}),
      ...(search ? { search } : {}),
    },
    { enabled: false },
  );

  const templateQuery = trpc.asset.getExportTemplate.useQuery(
    { assetTypeId },
    { enabled: false },
  );

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!assetTypeId) return;
    const result = await exportQuery.refetch();
    if (result.data) {
      downloadCsv(result.data.csvContent, result.data.fileName);
    }
  };

  const handleTemplate = async () => {
    if (!assetTypeId) return;
    const result = await templateQuery.refetch();
    if (result.data) {
      downloadCsv(result.data.csvContent, result.data.fileName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="mr-2 size-4" aria-hidden="true" />
            {tc("export")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("export_assets")}</DialogTitle>
          <DialogDescription>{t("export_description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Asset type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("select_asset_type")}</label>
            <Select value={assetTypeId} onValueChange={setAssetTypeId}>
              <SelectTrigger aria-label={t("select_asset_type")}>
                <SelectValue placeholder={t("select_asset_type")} />
              </SelectTrigger>
              <SelectContent>
                {(assetTypes ?? []).map((at) => (
                  <SelectItem key={at.id} value={at.id}>
                    {at.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("filterStatus")}</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label={t("filterStatus")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc("all")}</SelectItem>
                {ASSET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status_${s}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{tc("search")}</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchAssets")}
              aria-label={tc("search")}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleTemplate}
            disabled={!assetTypeId}
          >
            <FileDown className="mr-2 size-4" aria-hidden="true" />
            {t("export_download_template")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={!assetTypeId}
          >
            <Download className="mr-2 size-4" aria-hidden="true" />
            {tc("export")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

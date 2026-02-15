/**
 * ImportWizard component.
 *
 * @description Multi-step wizard for CSV asset import:
 * 1. Upload - file input accepting .csv
 * 2. Select type - dropdown of asset types
 * 3. Map columns - auto-detected mapping with manual overrides
 * 4. Preview - first 10 rows with per-cell validation errors
 * 5. Progress - progress bar with counts
 * 6. Results - success/error summary
 *
 * @module ImportWizard
 */

"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { trpc } from "@/shared/lib/trpc";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreviewTable } from "./ImportPreviewTable";

type WizardStep = "upload" | "selectType" | "mapColumns" | "preview" | "progress" | "results";

interface ImportWizardProps {
  /** Called when wizard is closed or completed */
  onClose?: () => void;
}

/**
 * ImportWizard renders a multi-step wizard for CSV asset import.
 *
 * @param props - ImportWizardProps
 * @returns Import wizard component
 */
export function ImportWizard({ onClose }: ImportWizardProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [step, setStep] = useState<WizardStep>("upload");
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    mapping: Record<string, string>;
    totalRows: number;
    previewRows: Array<{
      rowIndex: number;
      rawData: Record<string, string>;
      valid: boolean;
      errors: { field: string; message: string }[];
      parsedValues: Record<string, unknown>;
    }>;
    validCount: number;
    errorCount: number;
  } | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    status: string;
    successCount: number;
    errorCount: number;
  } | null>(null);

  const { data: assetTypes } = trpc.asset.listAssetTypes.useQuery();
  const { data: definitions } = trpc.asset.listAttributeDefinitions.useQuery(
    { assetTypeId },
    { enabled: !!assetTypeId },
  );

  const validatePreview = trpc.asset.validateImportPreview.useMutation();
  const startImport = trpc.asset.startImport.useMutation();
  const utils = trpc.useUtils();

  // Step 1: File Upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setStep("selectType");
    };
    reader.readAsText(file);
  }, []);

  // Step 3 -> Step 4: Run preview validation
  const handlePreview = async () => {
    const result = await validatePreview.mutateAsync({
      assetTypeId,
      csvContent,
      columnMapping: mapping,
      maxRows: 10,
    });
    setPreviewData(result);
    setMapping(result.mapping);
    setStep("preview");
  };

  // Step 4 -> Step 5: Start import
  const handleStartImport = async () => {
    const job = await startImport.mutateAsync({
      assetTypeId,
      fileName,
      csvContent,
      columnMapping: mapping,
    });
    setJobId(job.id);
    setStep("progress");

    // Simulate processing by polling (in production, this would be a background job)
    // For now, we set result directly
    setImportResult({
      status: "completed",
      successCount: previewData?.validCount ?? 0,
      errorCount: previewData?.errorCount ?? 0,
    });
    setStep("results");
    utils.asset.listImportJobs.invalidate();
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Upload className="size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("import_upload_description")}</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="sr-only"
                aria-label={t("import_upload_file")}
              />
              <Button asChild variant="default">
                <span>
                  <FileSpreadsheet className="mr-2 size-4" aria-hidden="true" />
                  {t("import_select_file")}
                </span>
              </Button>
            </label>
          </div>
        );

      case "selectType":
        return (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t("import_select_type_description")}</p>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>
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
        );

      case "mapColumns": {
        const headers = csvContent
          .trim()
          .split("\n")[0]
          ?.split(",")
          .map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];

        return (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t("import_map_description")}</p>
            <ColumnMapper
              headers={headers}
              definitions={definitions ?? []}
              mapping={mapping}
              onMappingChange={setMapping}
            />
          </div>
        );
      }

      case "preview":
        return (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("import_preview_description", { total: previewData?.totalRows ?? 0 })}
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                  {t("import_valid")}: {previewData?.validCount ?? 0}
                </Badge>
                <Badge variant="destructive">
                  {t("import_invalid")}: {previewData?.errorCount ?? 0}
                </Badge>
              </div>
            </div>
            {previewData && (
              <ImportPreviewTable
                headers={previewData.headers}
                rows={previewData.previewRows}
                mapping={previewData.mapping}
              />
            )}
          </div>
        );

      case "progress":
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{t("import_processing")}</p>
              <p className="text-sm text-muted-foreground">{t("import_processing_description")}</p>
            </div>
            <Progress value={50} className="w-64" />
          </div>
        );

      case "results":
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            {importResult?.status === "completed" ? (
              <Check className="size-12 text-green-600" aria-hidden="true" />
            ) : (
              <X className="size-12 text-destructive" aria-hidden="true" />
            )}
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {importResult?.status === "completed"
                  ? t("import_completed")
                  : t("import_failed")}
              </p>
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult?.successCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("import_success_count")}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {importResult?.errorCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("import_error_count")}</p>
                </div>
              </div>
            </div>
            <Button onClick={onClose}>{tc("close")}</Button>
          </div>
        );
    }
  };

  const canGoNext = () => {
    switch (step) {
      case "selectType":
        return !!assetTypeId;
      case "mapColumns":
        return Object.keys(mapping).length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case "selectType":
        setStep("mapColumns");
        break;
      case "mapColumns":
        handlePreview();
        break;
      case "preview":
        handleStartImport();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case "selectType":
        setStep("upload");
        setCsvContent("");
        setFileName("");
        break;
      case "mapColumns":
        setStep("selectType");
        break;
      case "preview":
        setStep("mapColumns");
        break;
    }
  };

  const stepIndex = ["upload", "selectType", "mapColumns", "preview", "progress", "results"].indexOf(step);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5" aria-hidden="true" />
          {t("import_wizard_title")}
        </CardTitle>
        {/* Step indicators */}
        <div className="flex gap-1 mt-2">
          {["upload", "selectType", "mapColumns", "preview", "progress", "results"].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
              role="presentation"
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {renderStep()}

        {/* Navigation buttons */}
        {!["upload", "progress", "results"].includes(step) && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              {tc("back")}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canGoNext() && step !== "preview"}
            >
              {step === "preview" ? t("import_start") : tc("next")}
              {step !== "preview" && <ArrowRight className="ml-2 size-4" aria-hidden="true" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

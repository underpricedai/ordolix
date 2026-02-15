"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Code2,
  Play,
  Save,
  Wand2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";

interface ScriptEditorProps {
  /** Script ID for editing, undefined for create mode */
  scriptId?: string;
  /** Callback on successful save */
  onSave?: () => void;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * ScriptEditor renders a code editing interface for creating and editing scripts.
 *
 * @description Features a monospace textarea as a placeholder for full Monaco
 * Editor integration. Includes a toolbar with run, save, and format buttons.
 * A console output panel at the bottom shows execution results. A metadata panel
 * on the side shows name, description, and trigger type.
 *
 * @param props - ScriptEditorProps
 * @returns A script editor component
 *
 * @example
 * <ScriptEditor scriptId="script-123" onSave={handleSave} onBack={goBack} />
 */
export function ScriptEditor({ scriptId, onSave, onBack }: ScriptEditorProps) {
  const t = useTranslations("scripts");
  const tc = useTranslations("common");
  const isMobile = useIsMobile();

  const isEdit = Boolean(scriptId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("manual");
  const [isEnabled, setIsEnabled] = useState(true);
  const [code, setCode] = useState(
    `// ${t("codeEditor")}\n// Write your TypeScript script here\n\nimport { context } from "@ordolix/scripting";\n\nexport default async function run() {\n  const issue = context.issue;\n  console.log("Processing issue:", issue.key);\n  \n  // Your logic here\n}\n`,
  );
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // tRPC mutations
  const createMutation = trpc.script.create.useMutation();
  const updateMutation = trpc.script.update.useMutation();
  const executeMutation = trpc.script.execute.useMutation();

  // Load existing script for editing
  const { data: existingScript } = trpc.script.getById.useQuery(
    { id: scriptId ?? "" },
    { enabled: Boolean(scriptId) },
  );

  useEffect(() => {
    if (existingScript) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existingScript as any;
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setTriggerType(data.triggerType ?? "manual");
      setIsEnabled(data.isEnabled ?? true);
      if (data.code) setCode(data.code);
    }
  }, [existingScript]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (isEdit && scriptId) {
        await updateMutation.mutateAsync({
          id: scriptId,
          name,
          description: description || undefined,
          triggerType: triggerType as "manual" | "scheduled" | "issue_created" | "issue_updated" | "transition" | "post_function",
          code,
          isEnabled,
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description: description || undefined,
          triggerType: triggerType as "manual" | "scheduled" | "issue_created" | "issue_updated" | "transition" | "post_function",
          code,
          isEnabled,
        });
      }
      onSave?.();
    } finally {
      setIsSaving(false);
    }
  }, [
    isEdit,
    scriptId,
    name,
    description,
    triggerType,
    code,
    isEnabled,
    createMutation,
    updateMutation,
    onSave,
  ]);

  const handleRun = useCallback(async () => {
    if (!scriptId) {
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${t("saveBeforeRun")}`,
      ]);
      return;
    }

    setIsRunning(true);
    setConsoleOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${t("executing")}...`,
    ]);

    try {
      const result = await executeMutation.mutateAsync({
        scriptId,
        context: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = (result as any)?.output ?? t("executionComplete");
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${output}`,
      ]);
    } catch (err) {
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err instanceof Error ? err.message : t("executionFailed")}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [scriptId, executeMutation, t]);

  const handleFormat = useCallback(() => {
    // Placeholder: in production, would use Prettier or similar
    setConsoleOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${t("formatted")}`,
    ]);
  }, [t]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label={t("editorToolbar")}
      >
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            {tc("back")}
          </Button>
        )}

        <div className="ms-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            aria-label={t("formatCode")}
          >
            <Wand2 className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("format")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            aria-label={t("executeScript")}
          >
            <Play className="mr-1.5 size-3.5" aria-hidden="true" />
            {isRunning ? t("running") : t("run")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || !code.trim() || isSaving}
          >
            <Save className="mr-1.5 size-3.5" aria-hidden="true" />
            {isSaving ? tc("loading") : tc("save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        {/* Code editor area */}
        <div className="flex flex-1 flex-col">
          {/* Code textarea (Monaco placeholder) */}
          <div className="flex-1 rounded-md border bg-[#1e1e1e] dark:bg-[#1e1e1e]">
            <div className="flex items-center gap-2 border-b border-[#333] px-3 py-1.5">
              <Code2 className="size-3.5 text-[#858585]" aria-hidden="true" />
              <span className="text-xs text-[#858585]">
                {name || t("untitledScript")}.ts
              </span>
              <Badge
                variant="outline"
                className="ms-auto border-[#555] bg-transparent text-[10px] text-[#858585]"
              >
                TypeScript
              </Badge>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={cn(
                "h-full min-h-[250px] w-full resize-none bg-transparent p-4 lg:min-h-[400px]",
                "font-mono text-sm leading-6 text-[#d4d4d4]",
                "focus:outline-none",
                "placeholder:text-[#555]",
              )}
              spellCheck={false}
              aria-label={t("codeEditor")}
              placeholder={t("codePlaceholder")}
            />
          </div>

          {/* Console output panel */}
          <Card className="mt-4">
            <CardHeader className="py-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("console")}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div
                className={cn(
                  "h-32 overflow-y-auto rounded bg-[#1e1e1e] p-3",
                  "font-mono text-xs leading-5 text-[#d4d4d4]",
                )}
                role="log"
                aria-label={t("console")}
                aria-live="polite"
              >
                {consoleOutput.length === 0 ? (
                  <span className="text-[#555]">{t("consoleEmpty")}</span>
                ) : (
                  consoleOutput.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        line.includes("ERROR") && "text-red-400",
                        line.includes("executing") && "text-yellow-400",
                      )}
                    >
                      {line}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata panel */}
        <div className="w-full shrink-0 space-y-4 lg:w-72">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="script-name" className="text-xs">
                  {t("scriptName")}
                </Label>
                <Input
                  id="script-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("scriptNamePlaceholder")}
                  className="text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="script-description" className="text-xs">
                  {t("description")}
                </Label>
                <Textarea
                  id="script-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">{t("triggerType")}</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="text-sm" aria-label={t("triggerType")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("typeManual")}</SelectItem>
                    <SelectItem value="scheduled">{t("typeScheduled")}</SelectItem>
                    <SelectItem value="issue_created">{t("typeIssueCreated")}</SelectItem>
                    <SelectItem value="issue_updated">{t("typeIssueUpdated")}</SelectItem>
                    <SelectItem value="transition">{t("typeTransition")}</SelectItem>
                    <SelectItem value="post_function">{t("typePostFunction")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="script-enabled" className="text-xs">
                  {t("enabled")}
                </Label>
                <Switch
                  id="script-enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

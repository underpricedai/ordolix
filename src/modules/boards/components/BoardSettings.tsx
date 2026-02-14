"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { trpc } from "@/shared/lib/trpc";

/**
 * Column visibility item for the settings panel.
 */
interface ColumnVisibilityItem {
  id: string;
  name: string;
  visible: boolean;
}

interface BoardSettingsProps {
  /** Board ID */
  boardId: string;
  /** Current board name */
  boardName: string;
  /** Column configuration */
  columns: ColumnVisibilityItem[];
  /** Current swimlane grouping */
  swimlaneGrouping?: string;
  /** Callback after settings are saved */
  onSaved?: () => void;
}

/**
 * BoardSettings renders a slide-out panel for configuring board properties.
 *
 * @description Includes board name editing, column visibility toggles,
 * swimlane grouping selection, and quick filter configuration.
 * Changes are persisted via tRPC `board.update` mutation.
 *
 * @param props - BoardSettingsProps
 * @returns A Sheet (slide-out panel) with board configuration controls
 *
 * @example
 * <BoardSettings
 *   boardId="board-1"
 *   boardName="Sprint Board"
 *   columns={columns}
 *   onSaved={refetch}
 * />
 */
export function BoardSettings({
  boardId,
  boardName: initialName,
  columns: initialColumns,
  swimlaneGrouping: initialSwimlane = "none",
  onSaved,
}: BoardSettingsProps) {
  const t = useTranslations("boards");
  const tc = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [boardName, setBoardName] = useState(initialName);
  const [columns, setColumns] = useState<ColumnVisibilityItem[]>(initialColumns);
  const [swimlane, setSwimlane] = useState(initialSwimlane);
  const [isDirty, setIsDirty] = useState(false);

  const updateMutation = trpc.board.update.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      onSaved?.();
    },
  });

  const handleNameChange = useCallback((value: string) => {
    setBoardName(value);
    setIsDirty(true);
  }, []);

  const handleColumnToggle = useCallback((columnId: string, visible: boolean) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible } : col,
      ),
    );
    setIsDirty(true);
  }, []);

  const handleSwimlaneChange = useCallback((value: string) => {
    setSwimlane(value);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      id: boardId,
      name: boardName || undefined,
      columns: columns
        .filter((c) => c.visible)
        .map((c) => ({
          id: c.id,
          name: c.name,
          statusIds: [c.id], // Simplified: each column maps to one status
        })),
    });
  }, [boardId, boardName, columns, updateMutation]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings2 className="mr-1.5 size-3.5" aria-hidden="true" />
          {t("boardSettings")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{t("boardSettings")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="flex flex-col gap-6 py-6">
            {/* Board name */}
            <div className="grid gap-2">
              <Label htmlFor="board-name">{t("boardName")}</Label>
              <Input
                id="board-name"
                value={boardName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("boardNamePlaceholder")}
              />
            </div>

            <Separator />

            {/* Column visibility */}
            <div className="grid gap-3">
              <Label className="text-base font-semibold">
                {t("columnVisibility")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("boardColumns")}
              </p>
              <div className="flex flex-col gap-2">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{col.name}</span>
                    <Switch
                      checked={col.visible}
                      onCheckedChange={(checked) =>
                        handleColumnToggle(col.id, checked)
                      }
                      aria-label={`${col.name} visibility`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Swimlane grouping */}
            <div className="grid gap-2">
              <Label htmlFor="swimlane-grouping">
                {t("swimlaneGrouping")}
              </Label>
              <Select value={swimlane} onValueChange={handleSwimlaneChange}>
                <SelectTrigger id="swimlane-grouping">
                  <SelectValue placeholder={t("swimlaneNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("swimlaneNone")}</SelectItem>
                  <SelectItem value="assignee">{t("swimlaneAssignee")}</SelectItem>
                  <SelectItem value="priority">{t("swimlanePriority")}</SelectItem>
                  <SelectItem value="type">{t("swimlaneType")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Quick filters */}
            <div className="grid gap-3">
              <Label className="text-base font-semibold">
                {t("quickFilterConfig")}
              </Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{t("myIssues")}</span>
                  <Switch defaultChecked aria-label={`${t("myIssues")} filter`} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{t("recentlyUpdated")}</span>
                  <Switch defaultChecked aria-label={`${t("recentlyUpdated")} filter`} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? tc("loading") : tc("save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

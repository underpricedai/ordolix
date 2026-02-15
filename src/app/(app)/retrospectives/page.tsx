"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RetroBoard } from "@/modules/retrospectives/components/RetroBoard";

/**
 * Retrospectives page with the interactive retro board.
 *
 * @description Displays the retro board with three columns (went well, to improve,
 * action items). Includes a create dialog for new retrospectives and a selector
 * for existing ones.
 */
export default function RetrospectivesPage() {
  const t = useTranslations("retrospectives");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [retroName, setRetroName] = useState("");
  const [activeRetroId] = useState("default");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("retrospectives") }]} />
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createRetro")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("createRetro")}</DialogTitle>
                <DialogDescription>
                  {t("createRetroDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="retro-name">{t("retroName")}</Label>
                  <Input
                    id="retro-name"
                    value={retroName}
                    onChange={(e) => setRetroName(e.target.value)}
                    placeholder={t("retroNamePlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={() => setCreateOpen(false)}
                  disabled={!retroName.trim()}
                >
                  {tc("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Retro board */}
        <RetroBoard retrospectiveId={activeRetroId} />
      </div>
    </>
  );
}

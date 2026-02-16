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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { RetroBoard } from "@/modules/retrospectives/components/RetroBoard";
import { trpc } from "@/shared/lib/trpc";

/**
 * Retrospectives page with the interactive retro board.
 *
 * @description Displays the retro board with three columns (went well, to improve,
 * action items). Includes a create dialog for new retrospectives that wires to
 * the tRPC retro.create mutation. Requires selecting a project and entering a name.
 */
export default function RetrospectivesPage() {
  const t = useTranslations("retrospectives");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [retroName, setRetroName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [activeRetroId, setActiveRetroId] = useState<string | null>(null);

  // Fetch projects for the project selector
  const { data: projectsData } = trpc.project.list.useQuery({ limit: 50 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects: any[] = (projectsData as { items?: any[] })?.items ?? [];

  const createMutation = trpc.retro.create.useMutation({
    onSuccess: (data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRetro = data as any;
      setCreateOpen(false);
      setRetroName("");
      setProjectId("");
      if (newRetro?.id) {
        setActiveRetroId(newRetro.id);
      }
    },
  });

  const handleCreate = () => {
    if (!retroName.trim() || !projectId) return;
    createMutation.mutate({
      name: retroName.trim(),
      projectId,
    });
  };

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
                <div className="grid gap-2">
                  <Label>{t("projectId")}</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger aria-label={t("selectProject")}>
                      <SelectValue placeholder={t("selectProject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  onClick={handleCreate}
                  disabled={!retroName.trim() || !projectId || createMutation.isPending}
                >
                  {createMutation.isPending ? tc("saving") : tc("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Retro board */}
        {activeRetroId && <RetroBoard retrospectiveId={activeRetroId} />}
      </div>
    </>
  );
}

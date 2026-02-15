/**
 * Project list page.
 *
 * @description Displays all projects as cards or in a table format
 * with project key, name, lead, issue count, and type.
 * Includes a create project dialog.
 *
 * @module projects-page
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Plus,
  Search,
  Inbox,
  FolderKanban,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";

export default function ProjectsPage() {
  const t = useTranslations("projectPages");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectType, setProjectType] = useState<
    "software" | "service_management" | "business"
  >("software");

  const utils = trpc.useUtils();

  const {
    data: projectsData,
    isLoading,
  } = trpc.project.list.useQuery({
    search: searchQuery || undefined,
  });

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      resetForm();
    },
  });

  const projects = projectsData?.items ?? [];

  function resetForm() {
    setProjectName("");
    setProjectKey("");
    setProjectType("software");
    setCreateOpen(false);
  }

  function handleCreate() {
    if (!projectName.trim() || !projectKey.trim()) return;
    createMutation.mutate({
      name: projectName.trim(),
      key: projectKey.trim(),
      projectTypeKey: projectType,
    });
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("projects") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createProject")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("createProject")}</DialogTitle>
                <DialogDescription>
                  {t("createProjectDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">{t("projectName")}</Label>
                  <Input
                    id="project-name"
                    placeholder={t("projectNamePlaceholder")}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-key">{t("projectKey")}</Label>
                  <Input
                    id="project-key"
                    placeholder={t("projectKeyPlaceholder")}
                    value={projectKey}
                    onChange={(e) =>
                      setProjectKey(e.target.value.toUpperCase())
                    }
                    maxLength={10}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-type">{t("projectType")}</Label>
                  <Select
                    value={projectType}
                    onValueChange={(v) =>
                      setProjectType(
                        v as "software" | "service_management" | "business",
                      )
                    }
                  >
                    <SelectTrigger id="project-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="service_management">
                        Service Desk
                      </SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    createMutation.isPending ||
                    !projectName.trim() ||
                    !projectKey.trim()
                  }
                >
                  {createMutation.isPending ? tc("loading") : tc("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={tc("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={tc("search")}
          />
        </div>

        {/* Project grid */}
        {isLoading ? (
          <ProjectsSkeleton />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-12" />}
            title={t("noProjects")}
            description={t("noProjectsDescription")}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createProject")}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.key}`}
                className="group"
              >
                <Card className="transition-shadow group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban
                        className="size-5"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {project.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {project.key}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {project.projectType ?? "Software"}
                      </span>
                      <span>
                        {project._count?.issues ?? 0} issues
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the projects grid.
 */
function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

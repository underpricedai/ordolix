/**
 * Project-scoped sprints page.
 *
 * @description Sprint management for a specific project. Lists sprints
 * with their status (planned, active, completed), issue counts, and
 * provides actions to create, start, and complete sprints.
 *
 * @module project-sprints-page
 */
"use client";

import { use, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Timer,
  Play,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
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
import { EmptyState } from "@/shared/components/empty-state";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sprint = any;

export default function ProjectSprintsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.sprints");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [createOpen, setCreateOpen] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("sprints") },
  ];

  // TODO: Replace with tRPC sprint.list query once sprint router is implemented
  const isLoading = false;
  const error = null;
  const sprints: Sprint[] = [];

  const resetForm = useCallback(() => {
    setSprintName("");
    setStartDate("");
    setEndDate("");
    setGoal("");
    setCreateOpen(false);
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />;
      case "completed":
        return <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" aria-hidden="true" />;
      default:
        return <Clock className="size-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default" as const;
      case "completed":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createSprint")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("createSprint")}</DialogTitle>
                <DialogDescription>
                  {t("createSprintDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="sprint-name">{t("sprintName")}</Label>
                  <Input
                    id="sprint-name"
                    placeholder={t("sprintNamePlaceholder")}
                    value={sprintName}
                    onChange={(e) => setSprintName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sprint-start">{t("startDate")}</Label>
                    <Input
                      id="sprint-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sprint-end">{t("endDate")}</Label>
                    <Input
                      id="sprint-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sprint-goal">{t("goal")}</Label>
                  <Input
                    id="sprint-goal"
                    placeholder={t("goalPlaceholder")}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  {tc("cancel")}
                </Button>
                <Button onClick={resetForm}>{tc("create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sprint list */}
        {error ? (
          <EmptyState
            icon={<Timer className="size-12" />}
            title={tc("error")}
            description={tc("retry")}
            action={
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {tc("retry")}
              </Button>
            }
          />
        ) : sprints.length === 0 ? (
          <EmptyState
            icon={<Timer className="size-12" />}
            title={t("noSprints")}
            description={t("noSprintsDescription")}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {t("createSprint")}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {sprints.map((sprint: Sprint) => (
              <Card key={sprint.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    {statusIcon(sprint.status)}
                    <CardTitle className="text-base">
                      {sprint.name}
                    </CardTitle>
                    <Badge variant={statusBadgeVariant(sprint.status)}>
                      {sprint.status === "active"
                        ? t("active")
                        : sprint.status === "completed"
                          ? t("completed")
                          : t("planned")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {sprint.status === "planned" && (
                      <Button variant="outline" size="sm">
                        <Play className="mr-1.5 size-3.5" aria-hidden="true" />
                        {t("start")}
                      </Button>
                    )}
                    {sprint.status === "active" && (
                      <Button variant="outline" size="sm">
                        <CheckCircle2
                          className="mr-1.5 size-3.5"
                          aria-hidden="true"
                        />
                        {t("complete")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {sprint.startDate && sprint.endDate && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {sprint.startDate} - {sprint.endDate}
                      </span>
                    )}
                    <span>
                      {t("issues", { count: sprint.issueCount ?? 0 })}
                    </span>
                    {sprint.storyPoints != null && (
                      <span>
                        {t("storyPoints", { count: sprint.storyPoints })}
                      </span>
                    )}
                  </div>
                  {sprint.goal && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {sprint.goal}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

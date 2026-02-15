/**
 * Project-scoped settings page.
 *
 * @description Project settings including general details (name, key,
 * description, lead), workflow assignment, notification settings,
 * and danger zone with archive project.
 *
 * @module project-settings-page
 */
"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Settings,
  Workflow,
  Bell,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { trpc } from "@/shared/lib/trpc";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.settings");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();

  // Track user overrides for form fields (null = use server data)
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(
    null,
  );
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnAssignment, setNotifyOnAssignment] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);

  const utils = trpc.useUtils();

  // Fetch project data
  const { data: project, isLoading } = trpc.project.getByKey.useQuery({ key });

  // Derive form values: user override takes precedence, then server data
  const projectName = nameOverride ?? project?.name ?? "";
  const description = descriptionOverride ?? project?.description ?? "";

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      // Reset overrides so form reads fresh server data
      setNameOverride(null);
      setDescriptionOverride(null);
      void utils.project.getByKey.invalidate({ key });
      void utils.project.list.invalidate();
    },
  });

  const archiveMutation = trpc.project.archive.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      router.push("/projects");
    },
  });

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: project?.name ?? key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("settings") },
  ];

  const handleSave = () => {
    if (!project?.id) return;
    updateMutation.mutate({
      id: project.id,
      name: projectName.trim() || undefined,
      description: description.trim() || null,
    });
  };

  const handleArchive = () => {
    if (!project?.id) return;
    archiveMutation.mutate({ id: project.id });
  };

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-6 p-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        {/* General settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle>{t("general")}</CardTitle>
            </div>
            <CardDescription>{t("generalDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-project-name">{t("projectName")}</Label>
              <Input
                id="settings-project-name"
                value={projectName}
                onChange={(e) => setNameOverride(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-project-key">{t("projectKey")}</Label>
              <Input
                id="settings-project-key"
                value={project?.key ?? key.toUpperCase()}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {t("projectKeyHelp")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-description">{t("description")}</Label>
              <Input
                id="settings-description"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescriptionOverride(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("projectLead")}</Label>
              <Input disabled value={project?.lead ?? ""} placeholder="-" />
            </div>
            <div className="grid gap-2">
              <Label>{t("projectCategory")}</Label>
              <Input disabled value={project?.projectType ?? "Software"} />
            </div>
          </CardContent>
        </Card>

        {/* Workflow settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle>{t("workflow")}</CardTitle>
            </div>
            <CardDescription>{t("workflowDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("currentWorkflow")}</p>
                <Badge variant="secondary" className="mt-1">
                  Default Workflow
                </Badge>
              </div>
              <Button variant="outline" size="sm">
                {t("changeWorkflow")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle>{t("notifications")}</CardTitle>
            </div>
            <CardDescription>{t("notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-create">{t("notifyOnIssueCreate")}</Label>
              <Switch
                id="notify-create"
                checked={notifyOnCreate}
                onCheckedChange={setNotifyOnCreate}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-status">{t("notifyOnStatusChange")}</Label>
              <Switch
                id="notify-status"
                checked={notifyOnStatusChange}
                onCheckedChange={setNotifyOnStatusChange}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-assignment">{t("notifyOnAssignment")}</Label>
              <Switch
                id="notify-assignment"
                checked={notifyOnAssignment}
                onCheckedChange={setNotifyOnAssignment}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-comment">{t("notifyOnComment")}</Label>
              <Switch
                id="notify-comment"
                checked={notifyOnComment}
                onCheckedChange={setNotifyOnComment}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? tc("loading") : tc("save")}
          </Button>
        </div>

        <Separator />

        {/* Danger zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="size-5 text-destructive"
                aria-hidden="true"
              />
              <CardTitle className="text-destructive">
                {t("dangerZone")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("deleteProject")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("deleteProjectConfirm")}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    {t("deleteProject")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteProject")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteProjectConfirm")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleArchive}
                      disabled={archiveMutation.isPending}
                    >
                      {archiveMutation.isPending ? tc("loading") : tc("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

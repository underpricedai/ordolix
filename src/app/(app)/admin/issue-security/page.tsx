/**
 * Admin Issue Security Schemes management page.
 *
 * @description CRUD for issue security schemes, levels, and level members.
 *
 * @module admin-issue-security
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Lock, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ResponsiveTable, type ResponsiveColumnDef } from "@/shared/components/responsive-table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

export default function AdminIssueSecurityPage() {
  const t = useTranslations("admin.issueSecurity");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: schemes, isLoading } = trpc.permission.issueSecurity.listSchemes.useQuery();
  const createScheme = trpc.permission.issueSecurity.createScheme.useMutation({
    onSuccess: () => {
      utils.permission.issueSecurity.listSchemes.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });
  const deleteScheme = trpc.permission.issueSecurity.deleteScheme.useMutation({
    onSuccess: () => utils.permission.issueSecurity.listSchemes.invalidate(),
  });
  const addLevel = trpc.permission.issueSecurity.addLevel.useMutation({
    onSuccess: () => utils.permission.issueSecurity.listSchemes.invalidate(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addLevelOpen, setAddLevelOpen] = useState(false);
  const [addLevelSchemeId, setAddLevelSchemeId] = useState("");
  const [levelName, setLevelName] = useState("");
  const [levelDesc, setLevelDesc] = useState("");

  const levelColumns: ResponsiveColumnDef<{ id: string; name: string; description: string | null }>[] = [
    {
      key: "name",
      header: tc("name"),
      priority: 1,
      cell: (level) => <span className="font-medium">{level.name}</span>,
    },
    {
      key: "description",
      header: tc("details"),
      priority: 3,
      cell: (level) => (
        <span className="text-sm text-muted-foreground">{level.description ?? "\u2014"}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createScheme")}
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{t("createScheme")}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>{t("createSchemeDescription")}</ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="scheme-name">{tc("name")}</Label>
                <Input
                  id="scheme-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheme-desc">{tc("details")}</Label>
                <Input
                  id="scheme-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
            </div>
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={() =>
                  createScheme.mutate({ name: newName, description: newDesc || undefined })
                }
                disabled={!newName.trim() || createScheme.isPending}
              >
                {tc("create")}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      {!schemes || schemes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSchemes")}</p>
          </CardContent>
        </Card>
      ) : (
        schemes.map((scheme) => (
          <Card key={scheme.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="size-5" aria-hidden="true" />
                    {scheme.name}
                  </CardTitle>
                  {scheme.description && (
                    <CardDescription>{scheme.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddLevelSchemeId(scheme.id);
                      setAddLevelOpen(true);
                    }}
                  >
                    <Plus className="mr-1 size-3" aria-hidden="true" />
                    {t("addLevel")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteScheme.mutate({ id: scheme.id })}
                    aria-label={`${tc("delete")} ${scheme.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("levelCount", { count: (scheme as { _count?: { levels: number } })._count?.levels ?? 0 })}
                {" · "}
                {t("projectCount", { count: (scheme as { _count?: { projects: number } })._count?.projects ?? 0 })}
              </p>
              <div className="rounded-md border">
                <ResponsiveTable
                  columns={levelColumns}
                  data={(scheme as { levels?: { id: string; name: string; description: string | null }[] }).levels ?? []}
                  rowKey={(level) => level.id}
                  emptyMessage={t("noLevels")}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Level dialog */}
      <ResponsiveDialog open={addLevelOpen} onOpenChange={setAddLevelOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("addLevel")}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="level-name">{tc("name")}</Label>
              <Input
                id="level-name"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                placeholder={t("levelNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level-desc">{tc("details")}</Label>
              <Input
                id="level-desc"
                value={levelDesc}
                onChange={(e) => setLevelDesc(e.target.value)}
                placeholder={t("levelDescPlaceholder")}
              />
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setAddLevelOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => {
                addLevel.mutate({
                  issueSecuritySchemeId: addLevelSchemeId,
                  name: levelName,
                  description: levelDesc || undefined,
                });
                setAddLevelOpen(false);
                setLevelName("");
                setLevelDesc("");
              }}
              disabled={!levelName.trim() || addLevel.isPending}
            >
              {tc("create")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
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

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("createScheme")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createScheme")}</DialogTitle>
              <DialogDescription>{t("createSchemeDescription")}</DialogDescription>
            </DialogHeader>
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
            <DialogFooter>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{tc("details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(scheme as { levels?: { id: string; name: string; description: string | null }[] }).levels?.map((level) => (
                      <TableRow key={level.id}>
                        <TableCell className="font-medium">{level.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {level.description ?? "—"}
                        </TableCell>
                      </TableRow>
                    )) ?? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                          {t("noLevels")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Level dialog */}
      <Dialog open={addLevelOpen} onOpenChange={setAddLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addLevel")}</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

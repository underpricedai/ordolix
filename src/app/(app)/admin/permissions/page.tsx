/**
 * Admin permission scheme editor page.
 *
 * @description Provides a real permission matrix backed by the tRPC
 * permission router. Supports scheme selection, grant toggling, and
 * scheme CRUD.
 *
 * @module admin-permissions
 */
"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { ALL_PROJECT_PERMISSIONS } from "@/modules/permissions/types/constants";

export default function AdminPermissionsPage() {
  const t = useTranslations("admin.permissions");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: schemes, isLoading: schemesLoading } =
    trpc.permission.permissionScheme.list.useQuery();
  const { data: roles } = trpc.permission.projectRole.list.useQuery();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Auto-select first scheme
  const effectiveSchemeId = selectedSchemeId || schemes?.[0]?.id || "";

  const { data: schemeDetail } = trpc.permission.permissionScheme.get.useQuery(
    { id: effectiveSchemeId },
    { enabled: !!effectiveSchemeId },
  );

  const createScheme = trpc.permission.permissionScheme.create.useMutation({
    onSuccess: () => {
      utils.permission.permissionScheme.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });

  const deleteScheme = trpc.permission.permissionScheme.delete.useMutation({
    onSuccess: () => {
      utils.permission.permissionScheme.list.invalidate();
      setSelectedSchemeId("");
    },
  });

  const addGrant = trpc.permission.permissionScheme.addGrant.useMutation({
    onSuccess: () => utils.permission.permissionScheme.get.invalidate(),
  });

  const removeGrant = trpc.permission.permissionScheme.removeGrant.useMutation({
    onSuccess: () => utils.permission.permissionScheme.get.invalidate(),
  });

  // Build grant lookup: permissionKey -> roleId -> grantId
  const grantMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    if (!schemeDetail?.grants) return map;
    for (const grant of schemeDetail.grants) {
      if (grant.holderType === "projectRole" && grant.projectRoleId) {
        if (!map.has(grant.permissionKey)) {
          map.set(grant.permissionKey, new Map());
        }
        map.get(grant.permissionKey)!.set(grant.projectRoleId, grant.id);
      }
    }
    return map;
  }, [schemeDetail]);

  function toggleGrant(permissionKey: string, roleId: string) {
    if (!effectiveSchemeId) return;
    const existingGrantId = grantMap.get(permissionKey)?.get(roleId);
    if (existingGrantId) {
      removeGrant.mutate({ id: existingGrantId });
    } else {
      addGrant.mutate({
        permissionSchemeId: effectiveSchemeId,
        permissionKey,
        holderType: "projectRole",
        projectRoleId: roleId,
      });
    }
  }

  if (schemesLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          {effectiveSchemeId && (
            <Button
              variant="outline"
              onClick={() => deleteScheme.mutate({ id: effectiveSchemeId })}
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheme-desc">{tc("details")}</Label>
                  <Input
                    id="scheme-desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
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
      </div>

      {/* Scheme selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="scheme-select" className="text-sm font-medium">
          {t("selectScheme")}
        </label>
        <Select value={effectiveSchemeId} onValueChange={setSelectedSchemeId}>
          <SelectTrigger id="scheme-select" className="w-64">
            <SelectValue placeholder={t("selectScheme")} />
          </SelectTrigger>
          <SelectContent>
            {schemes?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permission matrix */}
      {effectiveSchemeId && roles && roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" aria-hidden="true" />
              {schemeDetail?.name ?? t("title")}
            </CardTitle>
            <CardDescription>{schemeDetail?.description ?? t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">{t("permissionKey")}</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="w-[120px] text-center">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_PROJECT_PERMISSIONS.map((permKey) => (
                    <TableRow key={permKey}>
                      <TableCell className="font-medium text-sm">
                        {permKey}
                      </TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.id} className="text-center">
                          <Checkbox
                            checked={!!grantMap.get(permKey)?.get(role.id)}
                            onCheckedChange={() => toggleGrant(permKey, role.id)}
                            aria-label={`${permKey} - ${role.name}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!schemes || schemes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noSchemes")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

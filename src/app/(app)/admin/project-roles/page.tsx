/**
 * Admin Project Roles management page.
 *
 * @description CRUD for project roles within the organization.
 *
 * @module admin-project-roles
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Shield, Trash2, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
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
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

export default function AdminProjectRolesPage() {
  const t = useTranslations("admin.projectRoles");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: roles, isLoading } = trpc.permission.projectRole.list.useQuery();
  const createRole = trpc.permission.projectRole.create.useMutation({
    onSuccess: () => {
      utils.permission.projectRole.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });
  const deleteRole = trpc.permission.projectRole.delete.useMutation({
    onSuccess: () => utils.permission.projectRole.list.invalidate(),
  });
  const updateRole = trpc.permission.projectRole.update.useMutation({
    onSuccess: () => {
      utils.permission.projectRole.list.invalidate();
      setEditOpen(false);
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

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
              {t("createRole")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createRole")}</DialogTitle>
              <DialogDescription>{t("createRoleDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">{tc("name")}</Label>
                <Input
                  id="role-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">{tc("details")}</Label>
                <Input
                  id="role-desc"
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
                onClick={() => createRole.mutate({ name: newName, description: newDesc || undefined })}
                disabled={!newName.trim() || createRole.isPending}
              >
                {tc("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" aria-hidden="true" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!roles || roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRoles")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc("name")}</TableHead>
                    <TableHead>{tc("details")}</TableHead>
                    <TableHead className="w-[100px]">{tc("status")}</TableHead>
                    <TableHead className="w-[100px]">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {role.isDefault && (
                          <Badge variant="secondary">{t("default")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditId(role.id);
                              setEditName(role.name);
                              setEditDesc(role.description ?? "");
                              setEditOpen(true);
                            }}
                            aria-label={`${tc("edit")} ${role.name}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRole.mutate({ id: role.id })}
                            aria-label={`${tc("delete")} ${role.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editRole")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">{tc("name")}</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-desc">{tc("details")}</Label>
              <Input
                id="edit-role-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={() =>
                updateRole.mutate({
                  id: editId,
                  name: editName,
                  description: editDesc || undefined,
                })
              }
              disabled={!editName.trim() || updateRole.isPending}
            >
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Admin Groups management page.
 *
 * @description CRUD for groups with member management.
 *
 * @module admin-groups
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Users, Trash2, UserPlus, UserMinus } from "lucide-react";
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

export default function AdminGroupsPage() {
  const t = useTranslations("admin.groups");
  const tc = useTranslations("common");

  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.permission.group.list.useQuery();
  const createGroup = trpc.permission.group.create.useMutation({
    onSuccess: () => {
      utils.permission.group.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });
  const deleteGroup = trpc.permission.group.delete.useMutation({
    onSuccess: () => utils.permission.group.list.invalidate(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: members } = trpc.permission.group.listMembers.useQuery(
    { groupId: selectedGroupId! },
    { enabled: !!selectedGroupId },
  );

  const addMember = trpc.permission.group.addMember.useMutation({
    onSuccess: () => {
      utils.permission.group.listMembers.invalidate();
      utils.permission.group.list.invalidate();
      setAddUserId("");
    },
  });
  const removeMember = trpc.permission.group.removeMember.useMutation({
    onSuccess: () => {
      utils.permission.group.listMembers.invalidate();
      utils.permission.group.list.invalidate();
    },
  });

  const [addUserId, setAddUserId] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupColumns: ResponsiveColumnDef<any>[] = [
    {
      key: "name",
      header: tc("name"),
      priority: 1,
      cell: (group) => (
        <div>
          <span className="font-medium">{group.name}</span>
          {group.description && (
            <p className="text-xs text-muted-foreground">{group.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "members",
      header: t("members"),
      priority: 3,
      className: "w-[100px] text-center",
      cell: (group) => (
        <span>{(group as { _count?: { members: number } })._count?.members ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: tc("actions"),
      priority: 1,
      className: "w-[80px]",
      cell: (group) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            deleteGroup.mutate({ id: group.id });
          }}
          aria-label={`${tc("delete")} ${group.name}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
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
              {t("createGroup")}
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{t("createGroup")}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>{t("createGroupDescription")}</ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">{tc("name")}</Label>
                <Input
                  id="group-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">{tc("details")}</Label>
                <Input
                  id="group-desc"
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
                onClick={() => createGroup.mutate({ name: newName, description: newDesc || undefined })}
                disabled={!newName.trim() || createGroup.isPending}
              >
                {tc("create")}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Groups table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" aria-hidden="true" />
              {t("title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!groups || groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
            ) : (
              <div className="rounded-md border">
                <ResponsiveTable
                  columns={groupColumns}
                  data={groups}
                  rowKey={(group) => group.id}
                  onRowClick={(group) => setSelectedGroupId(group.id)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group members panel */}
        <Card>
          <CardHeader>
            <CardTitle>{t("members")}</CardTitle>
            <CardDescription>
              {selectedGroupId
                ? t("membersDescription")
                : t("selectGroupPrompt")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedGroupId && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    placeholder={t("userIdPlaceholder")}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={() => addMember.mutate({ groupId: selectedGroupId, userId: addUserId })}
                    disabled={!addUserId.trim() || addMember.isPending}
                    aria-label={t("addMember")}
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                {members && members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{m.user.name ?? m.user.email}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.user.email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeMember.mutate({ groupId: selectedGroupId, userId: m.user.id })
                          }
                          aria-label={`${t("removeMember")} ${m.user.name}`}
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

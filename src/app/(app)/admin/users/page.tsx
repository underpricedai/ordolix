/**
 * Admin user management page.
 *
 * @description Displays a table of users with search, invite dialog,
 * role editing, and activate/deactivate controls.
 *
 * @module admin-users
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Inbox,
  MoreHorizontal,
  UserCog,
  UserX,
} from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";

/**
 * Extracts initials from a full name string.
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  const utils = trpc.useUtils();

  const {
    data: usersData,
    isLoading,
    error,
  } = trpc.user.listUsers.useQuery({
    search: searchQuery || undefined,
  });

  const inviteMutation = trpc.user.inviteUser.useMutation({
    onSuccess: () => {
      void utils.user.listUsers.invalidate();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
    },
  });

  const updateRoleMutation = trpc.user.updateUserRole.useMutation({
    onSuccess: () => {
      void utils.user.listUsers.invalidate();
    },
  });

  const deactivateMutation = trpc.user.deactivateUser.useMutation({
    onSuccess: () => {
      void utils.user.listUsers.invalidate();
    },
  });

  const users = usersData?.items ?? [];

  /**
   * Handles the invite user form submission.
   */
  function handleInvite() {
    if (!inviteEmail) return;
    inviteMutation.mutate({
      email: inviteEmail,
      roleId: inviteRole,
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("inviteUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("inviteUser")}</DialogTitle>
              <DialogDescription>{t("inviteDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">{t("emailAddress")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">{t("selectRole")}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                    <SelectItem value="MEMBER">{t("roleMember")}</SelectItem>
                    <SelectItem value="VIEWER">{t("roleViewer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail}
              >
                {inviteMutation.isPending ? tc("saving") : tc("invite")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label={t("searchPlaceholder")}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <UserTableSkeleton />
      ) : !error && users.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title={t("noUsers")}
          description={t("noUsersDescription")}
          action={
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t("inviteUser")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t("avatar")}</TableHead>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("email")}</TableHead>
                <TableHead className="w-[120px]">{tc("role")}</TableHead>
                <TableHead className="w-[100px]">{tc("status")}</TableHead>
                <TableHead className="w-[140px]">{t("lastLogin")}</TableHead>
                <TableHead className="w-[60px]">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((member) => {
                const user = (member as { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null } }).user;
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Avatar className="size-8">
                        <AvatarImage
                          src={user?.image ?? undefined}
                          alt={user?.name ?? ""}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user?.name ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user?.email ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(member as { role?: string }).role ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                      >
                        {tc("active")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(member as { joinedAt?: string | Date }).joinedAt
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date((member as { joinedAt: string | Date }).joinedAt))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={tc("actions")}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (user?.id) {
                                const newRole = (member as { role?: string }).role === "admin" ? "member" : "admin";
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  roleId: newRole,
                                });
                              }
                            }}
                          >
                            <UserCog className="mr-2 size-4" aria-hidden="true" />
                            {t("editRole")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (user?.id) {
                                deactivateMutation.mutate({ userId: user.id });
                              }
                            }}
                          >
                            <UserX className="mr-2 size-4" aria-hidden="true" />
                            {t("deactivate")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the users table.
 */
function UserTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead className="w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[60px]"><Skeleton className="size-4" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="size-8 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-36" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="size-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

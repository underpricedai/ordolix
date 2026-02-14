/**
 * Admin permission scheme editor page.
 *
 * @description Provides a grid of permission checkboxes mapped to roles.
 * Includes a scheme selector and save functionality.
 *
 * @module admin-permissions
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Save, Shield } from "lucide-react";
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

/**
 * Permission definitions for the grid.
 */
const PERMISSIONS = [
  "createIssues",
  "editIssues",
  "deleteIssues",
  "transitionIssues",
  "assignIssues",
  "manageProject",
  "adminAccess",
] as const;

/**
 * Role definitions for the grid columns.
 */
const ROLES = ["roleAdmin", "roleLead", "roleMember", "roleViewer"] as const;

type PermissionKey = (typeof PERMISSIONS)[number];
type RoleKey = (typeof ROLES)[number];

/**
 * Default permission matrix: which roles have which permissions by default.
 */
const DEFAULT_PERMISSIONS: Record<PermissionKey, Record<RoleKey, boolean>> = {
  createIssues: { roleAdmin: true, roleLead: true, roleMember: true, roleViewer: false },
  editIssues: { roleAdmin: true, roleLead: true, roleMember: true, roleViewer: false },
  deleteIssues: { roleAdmin: true, roleLead: true, roleMember: false, roleViewer: false },
  transitionIssues: { roleAdmin: true, roleLead: true, roleMember: true, roleViewer: false },
  assignIssues: { roleAdmin: true, roleLead: true, roleMember: true, roleViewer: false },
  manageProject: { roleAdmin: true, roleLead: true, roleMember: false, roleViewer: false },
  adminAccess: { roleAdmin: true, roleLead: false, roleMember: false, roleViewer: false },
};

export default function AdminPermissionsPage() {
  const t = useTranslations("admin.permissions");
  const tc = useTranslations("common");

  const [selectedScheme, setSelectedScheme] = useState("default");
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const togglePermission = useCallback(
    (permission: PermissionKey, role: RoleKey) => {
      setPermissions((prev) => ({
        ...prev,
        [permission]: {
          ...prev[permission],
          [role]: !prev[permission][role],
        },
      }));
    },
    [],
  );

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
        <Button>
          <Save className="mr-2 size-4" aria-hidden="true" />
          {tc("save")}
        </Button>
      </div>

      {/* Scheme selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="scheme-select" className="text-sm font-medium">
          {t("selectScheme")}
        </label>
        <Select value={selectedScheme} onValueChange={setSelectedScheme}>
          <SelectTrigger id="scheme-select" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t("defaultScheme")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Permission grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" aria-hidden="true" />
            {t("defaultScheme")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    {tc("name")}
                  </TableHead>
                  {ROLES.map((role) => (
                    <TableHead key={role} className="w-[120px] text-center">
                      {t(role)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="font-medium">
                      {t(permission)}
                    </TableCell>
                    {ROLES.map((role) => (
                      <TableCell key={role} className="text-center">
                        <Checkbox
                          checked={permissions[permission][role]}
                          onCheckedChange={() =>
                            togglePermission(permission, role)
                          }
                          aria-label={`${t(permission)} - ${t(role)}`}
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
    </div>
  );
}

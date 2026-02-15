/**
 * SailPoint mapping list component.
 *
 * Displays all SailPoint-to-Ordolix group/role mappings with
 * last sync time and actions (sync, delete).
 *
 * @module integrations/sailpoint/components/SailPointMappingList
 */
"use client";

import { useTranslations } from "next-intl";
import { RefreshCw, Trash2, Loader2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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
import { trpc } from "@/shared/lib/trpc";

/**
 * Displays the list of SailPoint group mappings.
 * Provides sync and delete actions per mapping, plus a global sync all button.
 */
export function SailPointMappingList() {
  const t = useTranslations("integrations.sailpoint");
  const tc = useTranslations("common");

  const { data: mappings, refetch, isLoading } = trpc.sailpoint.listMappings.useQuery();

  const syncMappingMutation = trpc.sailpoint.syncMapping.useMutation({
    onSuccess: () => void refetch(),
  });

  const syncAllMutation = trpc.sailpoint.syncAll.useMutation({
    onSuccess: () => void refetch(),
  });

  const deleteMappingMutation = trpc.sailpoint.deleteMapping.useMutation({
    onSuccess: () => void refetch(),
  });

  function getTargetTypeBadge(targetType: string) {
    switch (targetType) {
      case "group":
        return <Badge variant="outline">{t("targetTypeGroup")}</Badge>;
      case "projectRole":
        return <Badge variant="secondary">{t("targetTypeProjectRole")}</Badge>;
      case "organizationRole":
        return <Badge>{t("targetTypeOrgRole")}</Badge>;
      default:
        return <Badge variant="outline">{targetType}</Badge>;
    }
  }

  function formatLastSync(date: Date | string | null) {
    if (!date) return t("neverSynced");
    const d = new Date(date);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{t("mappingsTitle")}</CardTitle>
          <CardDescription>{t("mappingsDescription")}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending || !mappings?.length}
        >
          {syncAllMutation.isPending ? (
            <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="me-2 size-4" aria-hidden="true" />
          )}
          {t("syncAll")}
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !mappings?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ArrowRightLeft className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("noMappings")}</p>
            <p className="text-xs text-muted-foreground">{t("noMappingsDescription")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sailPointGroup")}</TableHead>
                <TableHead>{t("targetType")}</TableHead>
                <TableHead>{t("targetId")}</TableHead>
                <TableHead>{t("syncDirection")}</TableHead>
                <TableHead>{t("lastSync")}</TableHead>
                <TableHead className="text-end">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">
                    {mapping.sailPointGroupName}
                    <span className="block text-xs text-muted-foreground">
                      {mapping.sailPointGroupId}
                    </span>
                  </TableCell>
                  <TableCell>{getTargetTypeBadge(mapping.targetType)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {mapping.targetId}
                    {mapping.roleName && (
                      <span className="ms-1 text-muted-foreground">
                        ({mapping.roleName})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {mapping.syncDirection}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastSync(mapping.lastSyncAt)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          syncMappingMutation.mutate({ mappingId: mapping.id })
                        }
                        disabled={syncMappingMutation.isPending}
                        aria-label={t("syncMapping")}
                      >
                        {syncMappingMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() =>
                          deleteMappingMutation.mutate({ id: mapping.id })
                        }
                        disabled={deleteMappingMutation.isPending}
                        aria-label={tc("delete")}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

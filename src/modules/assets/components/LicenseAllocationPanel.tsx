"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, User, Box } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/shared/components/responsive-dialog";
import { trpc } from "@/shared/lib/trpc";

interface LicenseAllocationPanelProps {
  licenseId: string;
}

/**
 * LicenseAllocationPanel displays the allocations for a license with
 * allocate and revoke actions.
 *
 * @param props - LicenseAllocationPanelProps
 * @returns The license allocation panel component
 */
export function LicenseAllocationPanel({ licenseId }: LicenseAllocationPanelProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [assetIdInput, setAssetIdInput] = useState("");
  const [userIdInput, setUserIdInput] = useState("");

  const { data: licenseData } = trpc.asset.getLicense.useQuery(
    { id: licenseId },
    { enabled: Boolean(licenseId) },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const license = licenseData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allocations: any[] = license?.allocations ?? [];

  const allocateMutation = trpc.asset.allocateLicense.useMutation({
    onSuccess: () => {
      utils.asset.getLicense.invalidate({ id: licenseId });
      utils.asset.getLicenseCompliance.invalidate({ licenseId });
      setShowAllocateDialog(false);
      setAssetIdInput("");
      setUserIdInput("");
    },
  });

  const revokeMutation = trpc.asset.revokeLicenseAllocation.useMutation({
    onSuccess: () => {
      utils.asset.getLicense.invalidate({ id: licenseId });
      utils.asset.getLicenseCompliance.invalidate({ licenseId });
    },
  });

  function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    allocateMutation.mutate({
      licenseId,
      assetId: assetIdInput || null,
      userId: userIdInput || null,
    });
  }

  const activeAllocations = allocations.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => !a.revokedAt,
  );
  const revokedAllocations = allocations.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.revokedAt,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("allocation_title")}</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAllocateDialog(true)}
          >
            <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("allocation_add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeAllocations.length === 0 && revokedAllocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("allocation_none")}</p>
        ) : (
          <div className="space-y-4">
            {/* Active allocations */}
            {activeAllocations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("allocation_active")} ({activeAllocations.length})
                </h4>
                <ul className="space-y-2" role="list">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {activeAllocations.map((alloc: any) => (
                    <li key={alloc.id} className="flex items-center justify-between rounded-md border p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {alloc.asset && (
                          <div className="flex items-center gap-1.5">
                            <Box className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            <span className="text-sm truncate">{alloc.asset.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {alloc.asset.assetTag}
                            </span>
                          </div>
                        )}
                        {alloc.user && (
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            <span className="text-sm truncate">{alloc.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {alloc.user.email}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground ms-2">
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                            new Date(alloc.allocatedAt),
                          )}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => revokeMutation.mutate({ allocationId: alloc.id })}
                        disabled={revokeMutation.isPending}
                        aria-label={t("allocation_revoke")}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Revoked allocations */}
            {revokedAllocations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("allocation_revoked")} ({revokedAllocations.length})
                </h4>
                <ul className="space-y-2 opacity-60" role="list">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {revokedAllocations.map((alloc: any) => (
                    <li key={alloc.id} className="flex items-center gap-2 rounded-md border border-dashed p-2.5">
                      {alloc.asset && (
                        <div className="flex items-center gap-1.5">
                          <Box className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm line-through">{alloc.asset.name}</span>
                        </div>
                      )}
                      {alloc.user && (
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm line-through">{alloc.user.name}</span>
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs ms-auto">
                        {t("allocation_revoked_label")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Allocate Dialog */}
      <ResponsiveDialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <ResponsiveDialogContent className="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("allocation_add")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("allocation_add_description")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleAllocate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alloc-asset-id">{t("allocation_asset_id")}</Label>
              <Input
                id="alloc-asset-id"
                value={assetIdInput}
                onChange={(e) => setAssetIdInput(e.target.value)}
                placeholder={t("allocation_asset_id_placeholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alloc-user-id">{t("allocation_user_id")}</Label>
              <Input
                id="alloc-user-id"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder={t("allocation_user_id_placeholder")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("allocation_at_least_one")}
            </p>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAllocateDialog(false)}>
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={allocateMutation.isPending || (!assetIdInput && !userIdInput)}
              >
                {allocateMutation.isPending ? tc("loading") : t("allocation_add")}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </Card>
  );
}

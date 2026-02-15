/**
 * SailPoint mapping creation form.
 *
 * Allows administrators to create a mapping from a SailPoint group
 * to an Ordolix group, project role, or organization role.
 *
 * @module integrations/sailpoint/components/SailPointMappingForm
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { trpc } from "@/shared/lib/trpc";
import type { MappingTargetType, SyncDirection } from "../schemas";

/**
 * Form for creating a new SailPoint-to-Ordolix mapping.
 *
 * @param props.onSuccess - Callback after successful creation
 */
export function SailPointMappingForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations("integrations.sailpoint");
  const tc = useTranslations("common");

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [targetType, setTargetType] = useState<MappingTargetType>("group");
  const [targetId, setTargetId] = useState("");
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("pull");
  const [isOpen, setIsOpen] = useState(false);

  const { data: sailPointGroups } = trpc.sailpoint.listSailPointGroups.useQuery(
    undefined,
    { enabled: isOpen },
  );

  const createMutation = trpc.sailpoint.createMapping.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess?.();
    },
  });

  function resetForm() {
    setSelectedGroupId("");
    setSelectedGroupName("");
    setTargetType("group");
    setTargetId("");
    setSyncDirection("pull");
    setIsOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      sailPointGroupId: selectedGroupId,
      sailPointGroupName: selectedGroupName,
      targetType,
      targetId,
      syncDirection,
    });
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="me-2 size-4" aria-hidden="true" />
        {t("addMapping")}
      </Button>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-base">{t("addMapping")}</CardTitle>
          <CardDescription>{t("addMappingDescription")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* SailPoint Group Selection */}
          <div className="grid gap-2">
            <Label htmlFor="sailpoint-group">{t("sailPointGroup")}</Label>
            <Select
              value={selectedGroupId}
              onValueChange={(value) => {
                setSelectedGroupId(value);
                const group = sailPointGroups?.find((g) => g.id === value);
                setSelectedGroupName(group?.name ?? "");
              }}
            >
              <SelectTrigger id="sailpoint-group">
                <SelectValue placeholder={t("selectSailPointGroup")} />
              </SelectTrigger>
              <SelectContent>
                {sailPointGroups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <span className="font-medium">{group.name}</span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      ({group.memberCount} {t("members")})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Type */}
          <div className="grid gap-2">
            <Label htmlFor="target-type">{t("targetType")}</Label>
            <Select
              value={targetType}
              onValueChange={(value) => {
                setTargetType(value as MappingTargetType);
                setTargetId("");
              }}
            >
              <SelectTrigger id="target-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">{t("targetTypeGroup")}</SelectItem>
                <SelectItem value="projectRole">{t("targetTypeProjectRole")}</SelectItem>
                <SelectItem value="organizationRole">{t("targetTypeOrgRole")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target ID / Selection */}
          <div className="grid gap-2">
            <Label htmlFor="target-id">{t("targetId")}</Label>
            {targetType === "organizationRole" ? (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="target-id">
                  <SelectValue placeholder={t("selectOrgRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                  <SelectItem value="member">{t("roleMember")}</SelectItem>
                  <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="target-id"
                placeholder={
                  targetType === "group"
                    ? t("targetIdGroupPlaceholder")
                    : t("targetIdRolePlaceholder")
                }
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              />
            )}
          </div>

          {/* Sync Direction */}
          <div className="grid gap-2">
            <Label htmlFor="sync-direction">{t("syncDirection")}</Label>
            <Select value={syncDirection} onValueChange={(v) => setSyncDirection(v as SyncDirection)}>
              <SelectTrigger id="sync-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pull">{t("syncPull")}</SelectItem>
                <SelectItem value="push">{t("syncPush")}</SelectItem>
                <SelectItem value="bidirectional">{t("syncBidirectional")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={resetForm}>
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={
              !selectedGroupId ||
              !targetId ||
              createMutation.isPending
            }
          >
            {createMutation.isPending && (
              <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {tc("create")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

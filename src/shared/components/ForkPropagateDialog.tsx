/**
 * Fork-or-Propagate dialog for shared scheme editing.
 *
 * @description When a user edits a scheme shared by multiple projects,
 * this dialog asks whether to apply changes to all projects (propagate)
 * or create a custom copy for just one project (fork).
 *
 * @module shared/components/ForkPropagateDialog
 */
"use client";

import { useTranslations } from "next-intl";
import { GitFork, Globe } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";

export interface ForkPropagateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemeType: string;
  projectCount: number;
  projectName: string;
  onPropagate: () => void;
  onFork: () => void;
  isPending?: boolean;
}

export function ForkPropagateDialog({
  open,
  onOpenChange,
  schemeType,
  projectCount,
  projectName,
  onPropagate,
  onFork,
  isPending = false,
}: ForkPropagateDialogProps) {
  const t = useTranslations("admin.schemeSharing");

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("sharedBy", { schemeType, count: projectCount })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="flex h-auto w-full items-start gap-3 p-4 text-left"
            onClick={onPropagate}
            disabled={isPending}
          >
            <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-medium">{t("applyToAll")}</p>
              <p className="text-xs text-muted-foreground">
                {t("applyToAllDescription")}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto w-full items-start gap-3 p-4 text-left"
            onClick={onFork}
            disabled={isPending}
          >
            <GitFork className="mt-0.5 size-5 shrink-0 text-orange-500" aria-hidden="true" />
            <div>
              <p className="font-medium">
                {t("customizeForProject", { projectName })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("customizeDescription")}
              </p>
            </div>
          </Button>
        </div>

        <ResponsiveDialogFooter />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

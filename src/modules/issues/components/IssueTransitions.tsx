"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

interface IssueTransitionsProps {
  /** The issue ID to show transitions for */
  issueId: string;
  /** Current status ID for visual indication */
  currentStatusId?: string;
  /** Callback after a successful transition */
  onTransitioned?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Shape of a transition returned by the workflow engine.
 */
interface Transition {
  id: string;
  name: string;
  toStatus: {
    id: string;
    name: string;
    category: string;
  };
}

/**
 * IssueTransitions renders workflow transition buttons for an issue.
 *
 * @description Shows available workflow transitions for the issue's current status.
 * Each transition is displayed as a button with the target status name. Clicking
 * a transition shows a confirmation dialog, then executes the transition via
 * tRPC workflow.transition mutation.
 * @param props - IssueTransitionsProps
 * @returns A row of transition buttons
 *
 * @example
 * <IssueTransitions issueId="issue-123" onTransitioned={() => refetch()} />
 */
export function IssueTransitions({
  issueId,
  onTransitioned,
  className,
}: IssueTransitionsProps) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");

  const [confirmTransition, setConfirmTransition] = useState<Transition | null>(null);

  const {
    data: transitions,
    isLoading,
  } = trpc.workflow.getAvailableTransitions.useQuery(
    { issueId },
    { enabled: !!issueId },
  );

  const utils = trpc.useUtils();

  const transitionMutation = trpc.workflow.transition.useMutation({
    onSuccess: () => {
      utils.issue.getByKey.invalidate();
      utils.issue.list.invalidate();
      utils.workflow.getAvailableTransitions.invalidate({ issueId });
      setConfirmTransition(null);
      onTransitioned?.();
    },
  });

  const handleTransitionClick = useCallback((transition: Transition) => {
    setConfirmTransition(transition);
  }, []);

  const handleConfirmTransition = useCallback(() => {
    if (!confirmTransition) return;
    transitionMutation.mutate({
      issueId,
      transitionId: confirmTransition.id,
    });
  }, [confirmTransition, issueId, transitionMutation]);

  const handleCancelTransition = useCallback(() => {
    setConfirmTransition(null);
  }, []);

  if (isLoading) {
    return (
      <div className={cn("flex gap-2", className)}>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  const availableTransitions = (transitions ?? []) as Transition[];

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        role="group"
        aria-label={t("transitions")}
      >
        <span className="text-xs font-medium text-muted-foreground">
          {t("transitions")}:
        </span>
        {availableTransitions.map((transition) => (
          <Button
            key={transition.id}
            variant="outline"
            size="sm"
            onClick={() => handleTransitionClick(transition)}
            disabled={transitionMutation.isPending}
            className="h-7 gap-1.5 text-xs"
            aria-label={t("transitionTo", { status: transition.toStatus.name })}
          >
            <ArrowRight className="size-3" aria-hidden="true" />
            <StatusBadge
              name={transition.toStatus.name}
              category={transition.toStatus.category as StatusCategory}
              className="pointer-events-none"
            />
          </Button>
        ))}
      </div>

      {/* Transition confirmation dialog */}
      <AlertDialog
        open={!!confirmTransition}
        onOpenChange={(open) => {
          if (!open) handleCancelTransition();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTransition
                ? t("transitionTo", { status: confirmTransition.toStatus.name })
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTransition
                ? `${t("transitionTo", { status: confirmTransition.toStatus.name })}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelTransition}
              disabled={transitionMutation.isPending}
            >
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransition}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending && (
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {tc("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

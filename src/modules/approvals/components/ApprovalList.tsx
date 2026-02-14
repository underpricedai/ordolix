"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  Check,
  X,
  Clock,
  User,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Approval = any;

/**
 * ApprovalList renders a list of pending approval requests.
 *
 * @description Shows cards with issue summary, requester, requested date,
 * and required approvers. Each card has Approve/Reject buttons and a
 * comment field for the decision.
 *
 * @returns Approval list component
 */
export function ApprovalList() {
  const t = useTranslations("approvals");
  const tc = useTranslations("common");

  const {
    data: approvalsData,
    isLoading,
    error,
  } = trpc.approval.pending.useQuery(
    { limit: 50 },
    { enabled: true },
  );

  const utils = trpc.useUtils();

  const decideMutation = trpc.approval.decide.useMutation({
    onSuccess: () => {
      void utils.approval.pending.invalidate();
    },
  });

  const approvals: Approval[] = approvalsData ?? [];

  if (isLoading) return <ApprovalListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  if (approvals.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-12" />}
        title={t("title")}
        description="No pending approvals. You're all caught up!"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {tc("itemCount", { count: approvals.length })} {t("pending").toLowerCase()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {approvals.map((approval: Approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onDecide={(decision, comment) => {
              decideMutation.mutate({
                id: approval.id,
                decision,
                comment: comment || undefined,
              });
            }}
            isPending={decideMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface ApprovalCardProps {
  approval: Approval;
  onDecide: (decision: "approved" | "rejected", comment: string) => void;
  isPending: boolean;
}

/**
 * ApprovalCard renders a single approval request card with decision controls.
 */
function ApprovalCard({ approval, onDecide, isPending }: ApprovalCardProps) {
  const t = useTranslations("approvals");
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const handleDecide = useCallback(
    (decision: "approved" | "rejected") => {
      onDecide(decision, comment);
      setComment("");
      setShowComment(false);
    },
    [comment, onDecide],
  );

  const requestedDate = approval.createdAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
        new Date(approval.createdAt),
      )
    : "-";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm">
              {approval.issue?.key ?? "Issue"}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {approval.issue?.summary ?? "Approval requested"}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              approval.status === "approved" &&
                "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              approval.status === "rejected" &&
                "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            <Clock className="mr-1 size-3" aria-hidden="true" />
            {t("pending")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Requester info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="size-3.5" aria-hidden="true" />
          <span>{t("requestedBy", { name: approval.requester?.name ?? "Unknown" })}</span>
        </div>

        {/* Request date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>{requestedDate}</span>
        </div>

        {/* Approvers */}
        {approval.approvers && (
          <div className="flex flex-wrap gap-1">
            {(approval.approvers as string[]).map((approver: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {approver}
              </Badge>
            ))}
          </div>
        )}

        {/* Comment area */}
        {showComment && (
          <div className="space-y-2">
            <Separator />
            <Textarea
              placeholder="Add a comment for your decision..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center gap-2 pt-0">
        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          onClick={() => handleDecide("approved")}
          disabled={isPending}
        >
          <Check className="mr-1 size-3.5" aria-hidden="true" />
          {t("approve")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={() => handleDecide("rejected")}
          disabled={isPending}
        >
          <X className="mr-1 size-3.5" aria-hidden="true" />
          {t("reject")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowComment(!showComment)}
          aria-label="Toggle comment"
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Skeleton loading state for the approval list.
 */
function ApprovalListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
            <CardFooter className="gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="size-8" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

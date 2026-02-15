"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { trpc } from "@/shared/lib/trpc";

interface Approval {
  id: string;
  stage: number;
  status: string;
  approverId: string;
  comment: string | null;
  decidedAt: string | null;
}

interface ProcurementApprovalPanelProps {
  approvals: Approval[];
  requestId: string;
  requestStatus: string;
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  approved: CheckCircle,
  rejected: XCircle,
  pending: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  approved: "text-green-600 dark:text-green-400",
  rejected: "text-red-600 dark:text-red-400",
  pending: "text-yellow-600 dark:text-yellow-400",
};

/**
 * ProcurementApprovalPanel shows the approval chain for a procurement request.
 * Displays stage progression, decision status, and allows approvers to act.
 *
 * @param props - ProcurementApprovalPanelProps
 * @returns The approval panel component
 */
export function ProcurementApprovalPanel({
  approvals,
  requestId,
  requestStatus,
}: ProcurementApprovalPanelProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const decideMutation = trpc.procurement.decideProcurementApproval.useMutation({
    onSuccess: () => {
      utils.procurement.getProcurementRequest.invalidate({ id: requestId });
      utils.procurement.listProcurementRequests.invalidate();
      setActiveApprovalId(null);
      setComment("");
    },
  });

  function handleDecision(approvalId: string, decision: "approved" | "rejected") {
    decideMutation.mutate({
      approvalId,
      decision,
      comment: comment || null,
    });
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("procurement_approvals")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("procurement_no_approvals")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("procurement_approvals")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvals.map((approval, index) => {
            const Icon = STATUS_ICONS[approval.status] ?? Clock;
            const colorClass = STATUS_COLORS[approval.status] ?? "";
            const isActive = activeApprovalId === approval.id;

            return (
              <div key={approval.id} className="relative">
                {/* Connection line */}
                {index < approvals.length - 1 && (
                  <div
                    className="absolute left-3 top-8 h-full w-0.5 bg-border"
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-start gap-3">
                  <Icon
                    className={`mt-0.5 size-6 shrink-0 ${colorClass}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t("procurement_approval_stage")} {approval.stage}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          approval.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : approval.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        }
                      >
                        {t(`approval_status_${approval.status}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>

                    {approval.comment && (
                      <div className="flex items-start gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                        <span>{approval.comment}</span>
                      </div>
                    )}

                    {approval.decidedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(approval.decidedAt))}
                      </p>
                    )}

                    {approval.status === "pending" && requestStatus === "pending_approval" && (
                      <div className="mt-2 space-y-2">
                        {isActive ? (
                          <>
                            <Textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder={t("procurement_approval_comment_placeholder")}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleDecision(approval.id, "approved")}
                                disabled={decideMutation.isPending}
                              >
                                <CheckCircle className="mr-1 size-3" aria-hidden="true" />
                                {t("approval_approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDecision(approval.id, "rejected")}
                                disabled={decideMutation.isPending}
                              >
                                <XCircle className="mr-1 size-3" aria-hidden="true" />
                                {t("approval_reject")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveApprovalId(null)}
                              >
                                {tc("cancel")}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveApprovalId(approval.id)}
                          >
                            {t("procurement_decide")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

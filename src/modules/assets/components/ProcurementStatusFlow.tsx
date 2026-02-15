"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

interface ProcurementStatusFlowProps {
  /** The current status in the procurement workflow */
  currentStatus: string;
  /** Whether this is a request flow or order flow */
  type: "request" | "order";
}

const REQUEST_FLOW = [
  "draft",
  "pending_approval",
  "approved",
  "ordered",
  "received",
] as const;

const ORDER_FLOW = [
  "ordered",
  "received",
  "invoiced",
  "paid",
] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    border: "border-primary",
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-800 dark:text-green-200",
    border: "border-green-300 dark:border-green-700",
  },
  upcoming: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  terminal: {
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
  },
};

/**
 * ProcurementStatusFlow visualizes the procurement workflow stages
 * with the current position highlighted.
 *
 * @param props - ProcurementStatusFlowProps
 * @returns The status flow visualization component
 */
export function ProcurementStatusFlow({ currentStatus, type }: ProcurementStatusFlowProps) {
  const t = useTranslations("assets");

  const flow = type === "request" ? REQUEST_FLOW : ORDER_FLOW;

  // Determine if current status is a terminal state
  const isTerminal = currentStatus === "cancelled" || currentStatus === "rejected";

  const currentIndex = (flow as readonly string[]).indexOf(currentStatus);

  function getStepState(index: number): keyof typeof STATUS_COLORS {
    if (isTerminal) {
      return "terminal";
    }
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "upcoming";
  }

  const i18nPrefix = type === "request" ? "request_status_" : "purchase_order_status_";

  return (
    <div className="flex items-center gap-1 overflow-x-auto p-2" role="list" aria-label={t("procurement_status_flow")}>
      {isTerminal ? (
        <div
          className={`flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS.terminal!.bg} ${STATUS_COLORS.terminal!.text} ${STATUS_COLORS.terminal!.border}`}
          role="listitem"
          aria-current="step"
        >
          {t(`${i18nPrefix}${currentStatus}` as Parameters<typeof t>[0])}
        </div>
      ) : (
        flow.map((step, index) => {
          const state = getStepState(index);
          const colors = STATUS_COLORS[state];

          return (
            <div key={step} className="flex items-center" role="listitem">
              <div
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${colors!.bg} ${colors!.text} ${colors!.border}`}
                aria-current={state === "active" ? "step" : undefined}
              >
                {t(`${i18nPrefix}${step}` as Parameters<typeof t>[0])}
              </div>
              {index < flow.length - 1 && (
                <ChevronRight
                  className="mx-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

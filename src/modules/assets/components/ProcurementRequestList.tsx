"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Send } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { trpc } from "@/shared/lib/trpc";
import { PROCUREMENT_REQUEST_STATUSES, PROCUREMENT_URGENCIES } from "../types/schemas";

interface ProcurementRequestListProps {
  onSelectRequest?: (id: string) => void;
}

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  normal: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  received: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  cancelled: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

/**
 * ProcurementRequestList renders a filterable table of procurement requests.
 *
 * @param props - ProcurementRequestListProps
 * @returns The procurement request list table component
 */
export function ProcurementRequestList({ onSelectRequest }: ProcurementRequestListProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.procurement.listProcurementRequests.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as typeof PROCUREMENT_REQUEST_STATUSES[number] : undefined,
    urgency: urgencyFilter !== "all" ? urgencyFilter as typeof PROCUREMENT_URGENCIES[number] : undefined,
    limit: 50,
  });

  const submitMutation = trpc.procurement.submitForApproval.useMutation({
    onSuccess: () => {
      utils.procurement.listProcurementRequests.invalidate();
    },
  });

  const items = data?.items ?? [];

  function formatCost(cost: unknown): string {
    if (cost == null) return "-";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(Number(cost));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder={t("procurement_search_requests")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tc("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {PROCUREMENT_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`request_status_${s}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("procurement_urgency")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {PROCUREMENT_URGENCIES.map((u) => (
              <SelectItem key={u} value={u}>
                {t(`urgency_${u}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tc("loading")}</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("procurement_no_requests")}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("procurement_request_number")}</TableHead>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{t("procurement_urgency")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
                <TableHead>{t("procurement_estimated_cost")}</TableHead>
                <TableHead>{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => onSelectRequest?.(item.id)}
                >
                  <TableCell className="font-mono text-sm">
                    {item.requestNumber}
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={URGENCY_COLORS[item.urgency] ?? ""}>
                      {t(`urgency_${item.urgency}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[item.status] ?? ""}>
                      {t(`request_status_${item.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCost(item.estimatedCost)}</TableCell>
                  <TableCell>
                    {item.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          submitMutation.mutate({ requestId: item.id });
                        }}
                        disabled={submitMutation.isPending}
                      >
                        <Send className="mr-1 size-3" aria-hidden="true" />
                        {t("procurement_submit")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

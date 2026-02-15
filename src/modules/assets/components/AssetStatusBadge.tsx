"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

const statusStyles: Record<string, string> = {
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  received: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  deployed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  in_use: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  retired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disposed: "bg-muted text-muted-foreground",
};

interface AssetStatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Color-coded badge showing the lifecycle status of an asset.
 *
 * @param props - AssetStatusBadgeProps
 * @returns A styled badge component
 */
export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const t = useTranslations("assets");

  const statusKey = `status_${status}` as Parameters<typeof t>[0];
  const label = t.has(statusKey) ? t(statusKey) : status.replace(/_/g, " ");

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent text-xs",
        statusStyles[status] ?? statusStyles.ordered,
        className,
      )}
    >
      {label}
    </Badge>
  );
}

"use client";

import { useTranslations } from "next-intl";
import {
  Clock,
  ArrowRight,
  Plus,
  Pencil,
  GitBranch,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface HistoryEntry {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  userId: string;
}

interface AssetLifecycleTimelineProps {
  history: HistoryEntry[];
}

const actionIcons: Record<string, typeof Clock> = {
  created: Plus,
  updated: Pencil,
  status_changed: ArrowRight,
  relationship_changed: GitBranch,
  deleted: Trash2,
};

const actionColors: Record<string, string> = {
  created: "bg-green-500",
  updated: "bg-blue-500",
  status_changed: "bg-indigo-500",
  relationship_changed: "bg-cyan-500",
  deleted: "bg-red-500",
};

/**
 * Visual timeline of asset status transitions and changes.
 *
 * @param props - AssetLifecycleTimelineProps
 * @returns A timeline component showing asset history
 */
export function AssetLifecycleTimeline({ history }: AssetLifecycleTimelineProps) {
  const t = useTranslations("assets");

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" aria-hidden="true" />
            {t("changeHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noChangeHistory")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4" aria-hidden="true" />
          {t("changeHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0" role="list" aria-label={t("changeHistory")}>
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          {history.map((entry, index) => {
            const Icon = actionIcons[entry.action] ?? Clock;

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative flex items-start gap-3 pb-4",
                  index === history.length - 1 && "pb-0",
                )}
                role="listitem"
              >
                {/* Dot */}
                <div
                  className={cn(
                    "z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    actionColors[entry.action] ?? "bg-muted-foreground",
                  )}
                >
                  <Icon className="size-3 text-white" aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {entry.action === "created" && t("historyCreated")}
                    {entry.action === "status_changed" && entry.oldValue && entry.newValue && (
                      <>
                        {t("historyStatusChanged")}{" "}
                        <span className="font-medium line-through text-muted-foreground">
                          {entry.oldValue.replace(/_/g, " ")}
                        </span>
                        {" → "}
                        <span className="font-medium">
                          {entry.newValue.replace(/_/g, " ")}
                        </span>
                      </>
                    )}
                    {entry.action === "updated" && entry.field && (
                      <>
                        {t("changed")} <span className="font-medium">{entry.field}</span>
                        {entry.oldValue && (
                          <>
                            {" "}{t("from")}{" "}
                            <span className="line-through text-muted-foreground">
                              {entry.oldValue}
                            </span>
                          </>
                        )}
                        {entry.newValue && (
                          <>
                            {" "}{t("to")}{" "}
                            <span className="font-medium">{entry.newValue}</span>
                          </>
                        )}
                      </>
                    )}
                    {entry.action === "relationship_changed" && (
                      <>
                        {entry.newValue
                          ? `${t("historyRelationshipAdded")}: ${entry.newValue}`
                          : `${t("historyRelationshipRemoved")}: ${entry.oldValue}`}
                      </>
                    )}
                    {entry.action === "deleted" && t("historyDeleted")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.createdAt))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

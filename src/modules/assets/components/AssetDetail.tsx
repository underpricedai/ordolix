"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Box,
  Clock,
  GitBranch,
  Link as LinkIcon,
  User,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Shape of a relationship between assets.
 */
interface AssetRelationship {
  id: string;
  type: string;
  relatedAsset: {
    id: string;
    name: string;
    assetType: { name: string };
  };
}

/**
 * Shape of a linked issue.
 */
interface LinkedIssue {
  id: string;
  key: string;
  summary: string;
  statusName: string;
}

/**
 * Shape of a change history entry.
 */
interface ChangeHistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
}

interface AssetDetailProps {
  /** Asset ID to display */
  assetId: string;
  /** Callback to navigate back to the asset list */
  onBack?: () => void;
  /** Callback to open the edit form */
  onEdit?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  retired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

/**
 * AssetDetail renders the full detail view for a single asset.
 *
 * @description Displays a properties panel with all asset fields, a
 * relationships section showing connected assets, linked issues, and a
 * change history timeline.
 *
 * @param props - AssetDetailProps
 * @returns The asset detail view component
 *
 * @example
 * <AssetDetail assetId="asset-123" onBack={() => setView("list")} />
 */
export function AssetDetail({ assetId, onBack, onEdit }: AssetDetailProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  // tRPC query for asset details
  const { data: assetData, isLoading, error } = trpc.asset.getAsset.useQuery(
    { id: assetId },
    { enabled: Boolean(assetId) },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = assetData as any;

  if (isLoading) {
    return <AssetDetailSkeleton />;
  }

  if (error || !asset) {
    return (
      <EmptyState
        icon={<Box className="size-12" />}
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

  const attributes: Record<string, unknown> = asset.attributes ?? {};
  const relationships: AssetRelationship[] = asset.relationships ?? [];
  const linkedIssues: LinkedIssue[] = asset.linkedIssues ?? [];
  const changeHistory: ChangeHistoryEntry[] = asset.changeHistory ?? [];

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={tc("back")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Box className="size-6 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-foreground">
              {asset.name}
            </h2>
            <Badge
              variant="outline"
              className={cn(
                "border-transparent",
                statusStyles[asset.status] ?? statusStyles.active,
              )}
            >
              {asset.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {asset.assetType?.name ?? t("unknownType")}
          </p>
        </div>
        {onEdit && (
          <Button variant="outline" onClick={() => onEdit(assetId)}>
            {tc("edit")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Properties panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("properties")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("name")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{asset.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("type")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {asset.assetType?.name ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("status")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{asset.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("owner")}
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                  <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {asset.owner?.name ?? "-"}
                </dd>
              </div>

              {/* Dynamic attributes from schema */}
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {String(value ?? "-")}
                  </dd>
                </div>
              ))}

              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("lastUpdated")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {asset.updatedAt
                    ? new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(asset.updatedAt))
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("created")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {asset.createdAt
                    ? new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(asset.createdAt))
                    : "-"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Sidebar: Relationships + Linked Issues */}
        <div className="space-y-6">
          {/* Relationships */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="size-4" aria-hidden="true" />
                {t("relationships")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noRelationships")}
                </p>
              ) : (
                <ul className="space-y-3" role="list">
                  {relationships.map((rel) => (
                    <li key={rel.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {rel.type}
                      </Badge>
                      <span className="truncate text-sm">
                        {rel.relatedAsset.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({rel.relatedAsset.assetType.name})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Linked Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="size-4" aria-hidden="true" />
                {t("linkedIssues")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noLinkedIssues")}
                </p>
              ) : (
                <ul className="space-y-2" role="list">
                  {linkedIssues.map((issue) => (
                    <li key={issue.id} className="flex items-center gap-2">
                      <span className="shrink-0 text-sm font-medium text-primary">
                        {issue.key}
                      </span>
                      <span className="truncate text-sm text-foreground">
                        {issue.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" aria-hidden="true" />
            {t("changeHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {changeHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noChangeHistory")}
            </p>
          ) : (
            <div className="space-y-4" role="list" aria-label={t("changeHistory")}>
              {changeHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3"
                  role="listitem"
                >
                  <div className="mt-0.5 size-2 shrink-0 rounded-full bg-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{entry.changedBy}</span>{" "}
                      {t("changed")}{" "}
                      <span className="font-medium">{entry.field}</span>
                      {entry.oldValue && (
                        <>
                          {" "}
                          {t("from")}{" "}
                          <span className="line-through text-muted-foreground">
                            {entry.oldValue}
                          </span>
                        </>
                      )}
                      {entry.newValue && (
                        <>
                          {" "}
                          {t("to")}{" "}
                          <span className="font-medium">{entry.newValue}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.changedAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton loading state for AssetDetail.
 */
function AssetDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-8" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

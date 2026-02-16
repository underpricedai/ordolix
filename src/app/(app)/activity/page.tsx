/**
 * Activity feed page.
 *
 * @description Shows recent activity across the organization as a timeline
 * list of audit log entries. Supports filtering by entity type via tabs
 * and cursor-based pagination via "Load more". Each entry shows the user
 * avatar, action description, entity link, and relative timestamp.
 */
"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { ActivityItem } from "@/shared/components/activity-item";
import { EmptyState } from "@/shared/components/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { trpc } from "@/shared/lib/trpc";

/**
 * Maps tab values to entity type filters.
 */
const ENTITY_TYPE_MAP: Record<string, string | undefined> = {
  all: undefined,
  issues: "Issue",
  projects: "Project",
  admin: "Admin",
};

/**
 * ActivityPage renders the organization-wide activity feed.
 *
 * @description Fetches recent audit log entries via the activity.list tRPC
 * endpoint with cursor pagination. Provides tab-based filtering for All,
 * Issues, Projects, and Admin entity types. Shows a loading skeleton while
 * fetching and an empty state when no activity exists.
 */
export default function ActivityPage() {
  const t = useTranslations("activity");

  const [activeTab, setActiveTab] = useState("all");

  const entityType = ENTITY_TYPE_MAP[activeTab];

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.activity.list.useInfiniteQuery(
    { limit: 50, entityType },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("title") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        {/* Filter tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">{t("all")}</TabsTrigger>
            <TabsTrigger value="issues">{t("issues")}</TabsTrigger>
            <TabsTrigger value="projects">{t("projects")}</TabsTrigger>
            <TabsTrigger value="admin">{t("admin")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Activity feed */}
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-12" />}
            title={t("noActivity")}
            description={t("noActivityDescription")}
          />
        ) : (
          <div className="space-y-1" role="list" aria-label={t("title")}>
            {items.map((item) => (
              <ActivityItem
                key={item.id}
                action={item.action}
                entityType={item.entityType}
                entityId={item.entityId}
                userName={item.user?.name ?? null}
                userImage={item.user?.image ?? null}
                timestamp={item.createdAt}
                details={
                  item.diff && typeof item.diff === "object"
                    ? (item.diff as Record<string, unknown>)
                    : undefined
                }
              />
            ))}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? t("loading") : t("loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the activity feed.
 */
function ActivityFeedSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

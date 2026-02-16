"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Star,
  ListTodo,
  FolderKanban,
  Columns3,
  LayoutDashboard,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

/** Maps entity types to their icon components. */
const entityIcons: Record<string, React.ElementType> = {
  issue: ListTodo,
  project: FolderKanban,
  board: Columns3,
  dashboard: LayoutDashboard,
};

/** Maps entity types to their detail page path prefix. */
const entityPaths: Record<string, string> = {
  issue: "/issues",
  project: "/projects",
  board: "/boards",
  dashboard: "/dashboards",
};

/** Tab filter values. */
type TabValue = "all" | "issue" | "project" | "board" | "dashboard";

/**
 * Favorites page — displays all bookmarked entities for the current user.
 *
 * @description Provides tabbed filtering by entity type (All, Issues, Projects,
 * Boards, Dashboards). Each item links to the entity's detail page.
 * Shows an empty state when no favorites exist.
 */
export default function FavoritesPage() {
  const t = useTranslations("favorites");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const entityType = activeTab === "all" ? undefined : activeTab;
  const { data: favorites, isLoading } = trpc.favorite.list.useQuery(
    entityType ? { entityType } : undefined,
  );

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("title") }]} />
      <div className="flex-1 p-6">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">{t("all")}</TabsTrigger>
            <TabsTrigger value="issue">{t("issues")}</TabsTrigger>
            <TabsTrigger value="project">{t("projects")}</TabsTrigger>
            <TabsTrigger value="board">{t("boards")}</TabsTrigger>
            <TabsTrigger value="dashboard">{t("dashboards")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        {isLoading ? (
          <FavoritesPageSkeleton />
        ) : !favorites || favorites.length === 0 ? (
          <EmptyState
            icon={<Star className="size-12" />}
            title={t("noFavorites")}
            description={t("noFavoritesDescription")}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border" role="list">
            {favorites.map((fav) => {
              const Icon = entityIcons[fav.entityType] ?? Star;
              const basePath = entityPaths[fav.entityType] ?? "/";
              const href = `${basePath}/${fav.entityId}`;

              return (
                <li key={fav.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <Icon
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {fav.entityId}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {fav.entityType}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-xs text-muted-foreground"
                      dateTime={
                        fav.createdAt instanceof Date
                          ? fav.createdAt.toISOString()
                          : String(fav.createdAt)
                      }
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(
                        fav.createdAt instanceof Date
                          ? fav.createdAt
                          : new Date(String(fav.createdAt)),
                      )}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the favorites page.
 */
function FavoritesPageSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border p-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

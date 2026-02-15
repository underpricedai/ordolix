"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserPlus,
  ArrowRightLeft,
  AtSign,
  ShieldAlert,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { EmptyState } from "@/shared/components/empty-state";
import { NotificationPreferences } from "@/modules/notifications/components/NotificationPreferences";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Notification = any;

/** Maps notification type to an icon component */
const TYPE_ICONS: Record<string, React.ElementType> = {
  issue_assigned: UserPlus,
  comment_added: MessageSquare,
  status_changed: ArrowRightLeft,
  mention: AtSign,
  sla_warning: ShieldAlert,
  approval_requested: ClipboardCheck,
};

/**
 * Formats a timestamp to a relative time string.
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

/**
 * Notifications page with full notification list and preferences.
 *
 * @description Shows all notifications in a full-page view with tabs for
 * the notification list and notification preferences. Supports marking
 * individual and all notifications as read.
 */
export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tn = useTranslations("nav");

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  const {
    data: notificationsData,
    isLoading,
  } = trpc.notification.list.useQuery(
    { limit: 50 },
    { refetchInterval: 30_000 },
  );

  const utils = trpc.useUtils();

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const handleMarkRead = useCallback(
    (id: string) => {
      markReadMutation.mutate({ id });
    },
    [markReadMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate({});
  }, [markAllReadMutation]);

  const notifications: Notification[] = notificationsData ?? [];
  const displayCount = unreadCount ?? 0;

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("notifications") }]} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          {displayCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-2 size-4" aria-hidden="true" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        {/* Tabs: All Notifications | Preferences */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Bell className="size-4" aria-hidden="true" />
              {t("allNotifications")}
              {displayCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {displayCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="size-4" aria-hidden="true" />
              {t("viewPreferences")}
            </TabsTrigger>
          </TabsList>

          {/* Notification list tab */}
          <TabsContent value="all" className="space-y-2">
            {isLoading ? (
              <NotificationPageSkeleton />
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="size-12" />}
                title={t("noNotifications")}
                description={t("noNotificationsDescription")}
              />
            ) : (
              <div className="divide-y rounded-md border">
                {notifications.map((notification: Notification) => {
                  const IconComponent =
                    TYPE_ICONS[notification.type] ?? Bell;
                  const isRead = notification.isRead;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50",
                        !isRead && "bg-primary/5",
                      )}
                      onClick={() => {
                        if (!isRead) handleMarkRead(notification.id);
                      }}
                      aria-label={`${notification.title}${!isRead ? " (unread)" : ""}`}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                          isRead
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <IconComponent className="size-5" aria-hidden="true" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm",
                            !isRead && "font-medium",
                          )}
                        >
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!isRead && (
                        <div
                          className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Preferences tab */}
          <TabsContent value="preferences">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/**
 * Skeleton loading state for the notification page list.
 */
function NotificationPageSkeleton() {
  return (
    <div className="divide-y rounded-md border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-4 py-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

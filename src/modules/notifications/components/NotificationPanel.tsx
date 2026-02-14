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
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

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
 * NotificationPanel renders a bell icon button with dropdown notification list.
 *
 * @description Shows a bell icon with unread count badge. Clicking opens a
 * popover with the notification list. Each notification shows an icon,
 * message, timestamp, and read/unread indicator. Includes "Mark all as read" button.
 *
 * @returns Notification panel component
 */
export function NotificationPanel() {
  const t = useTranslations("notifications");

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  const {
    data: notificationsData,
    isLoading,
  } = trpc.notification.list.useQuery(
    { limit: 20 },
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={t("title")}
        >
          <Bell className="size-4" aria-hidden="true" />
          {displayCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center p-0 text-[10px]"
            >
              {displayCount > 99 ? "99+" : displayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0"
        role="dialog"
        aria-label={t("title")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            {displayCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t("unread", { count: displayCount })}
              </Badge>
            )}
          </div>
          {displayCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="text-xs"
            >
              <CheckCheck className="mr-1 size-3.5" aria-hidden="true" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <NotificationListSkeleton />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {t("noNotifications")}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => {
                const IconComponent =
                  TYPE_ICONS[notification.type] ?? Bell;
                const isRead = notification.isRead;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
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
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <IconComponent className="size-4" aria-hidden="true" />
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
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
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
                        className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Skeleton loading state for the notification list.
 */
function NotificationListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

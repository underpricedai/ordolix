"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ResponsiveTable,
  type ResponsiveColumnDef,
} from "@/shared/components/responsive-table";
import { trpc } from "@/shared/lib/trpc";

/** Notification event types with labels */
const EVENT_TYPES = [
  { value: "issue_assigned", label: "Issue Assigned" },
  { value: "comment_added", label: "Comment Added" },
  { value: "status_changed", label: "Status Changed" },
  { value: "mention", label: "Mentioned" },
  { value: "sla_warning", label: "SLA Warning" },
  { value: "approval_requested", label: "Approval Requested" },
] as const;

type NotificationType = (typeof EVENT_TYPES)[number]["value"];

/** Channel options */
const CHANNELS = [
  { value: "in_app", label: "In-App Only" },
  { value: "email", label: "Email Only" },
  { value: "both", label: "Both" },
  { value: "none", label: "None" },
] as const;

type Channel = (typeof CHANNELS)[number]["value"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Preference = any;

/**
 * NotificationPreferences renders a settings table for notification channels.
 *
 * @description Displays a table with event types as rows and channel selectors
 * as the configuration. Each row has a dropdown to choose the notification
 * channel (in-app, email, both, none).
 *
 * @returns Notification preferences component
 */
export function NotificationPreferences() {
  const t = useTranslations("notifications");

  const {
    data: preferences,
    isLoading,
  } = trpc.notification.listPreferences.useQuery({});

  const utils = trpc.useUtils();

  const updateMutation = trpc.notification.updatePreference.useMutation({
    onSuccess: () => {
      void utils.notification.listPreferences.invalidate();
    },
  });

  const handleChannelChange = useCallback(
    (eventType: NotificationType, channel: Channel) => {
      updateMutation.mutate({ eventType, channel });
    },
    [updateMutation],
  );

  /**
   * Gets the current channel setting for an event type.
   */
  function getChannelForType(eventType: string): Channel {
    if (!preferences) return "both";
    const pref = (preferences as Preference[]).find(
      (p: Preference) => p.eventType === eventType,
    );
    return (pref?.channel as Channel) ?? "both";
  }

  if (isLoading) return <PreferencesSkeleton />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="size-5" aria-hidden="true" />
          <CardTitle>{t("preferences")}</CardTitle>
        </div>
        <CardDescription>
          Choose how you want to be notified for each event type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <ResponsiveTable
            columns={
              [
                {
                  key: "channel",
                  header: "Channel",
                  cell: (event) => (
                    <Select
                      value={getChannelForType(event.value)}
                      onValueChange={(val) =>
                        handleChannelChange(event.value, val as Channel)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value}>
                            {ch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ),
                  priority: 1,
                  className: "w-[200px]",
                },
                {
                  key: "type",
                  header: "Event Type",
                  cell: (event) => (
                    <div className="flex flex-col">
                      <span className="font-medium">{event.label}</span>
                    </div>
                  ),
                  priority: 2,
                },
                {
                  key: "enabled",
                  header: "Enabled",
                  cell: (event) => (
                    <span className="text-sm text-muted-foreground">
                      {getChannelForType(event.value) !== "none" ? "Yes" : "No"}
                    </span>
                  ),
                  priority: 1,
                },
              ] satisfies ResponsiveColumnDef<(typeof EVENT_TYPES)[number]>[]
            }
            data={[...EVENT_TYPES]}
            rowKey={(event) => event.value}
            mobileCard={(event) => (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{event.label}</span>
                  <Select
                    value={getChannelForType(event.value)}
                    onValueChange={(val) =>
                      handleChannelChange(event.value, val as Channel)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for notification preferences.
 */
function PreferencesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

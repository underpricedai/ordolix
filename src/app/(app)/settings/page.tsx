"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import {
  Settings,
  User,
  Bell,
  Palette,
  Key,
  Copy,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

/**
 * Profile section of the settings page.
 *
 * @description Renders editable profile fields including display name,
 * email (read-only), and avatar. Fetches profile data via tRPC and
 * saves changes with updateProfile mutation.
 */
function ProfileSection() {
  const t = useTranslations("settings");
  const { data: profile, isLoading, error } = trpc.user.getProfile.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();

  const [displayName, setDisplayName] = useState("");
  const [prevProfileName, setPrevProfileName] = useState<string | null>(null);

  // Sync form state when profile data first loads (React-recommended
  // pattern for adjusting state based on changed props/data during render).
  const profileName = profile?.name ?? null;
  if (profileName !== null && prevProfileName === null) {
    setPrevProfileName(profileName);
    setDisplayName(profileName);
  }

  const handleSave = useCallback(() => {
    updateProfile.mutate({ name: displayName });
  }, [updateProfile, displayName]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
            <Separator />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <p className="text-sm">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = (profile?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" aria-hidden="true" />
            {t("profile")}
          </CardTitle>
          <CardDescription>{t("profileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={profile?.image ?? ""} alt={t("avatar")} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                {t("changeAvatar")}
              </Button>
              <Button variant="ghost" size="sm">
                {t("removeAvatar")}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <div className="grid gap-2">
            <Label htmlFor="display-name">{t("displayName")}</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
              className="max-w-md"
            />
          </div>

          {/* Email (read-only) */}
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email ?? ""}
              readOnly
              disabled
              placeholder={t("emailPlaceholder")}
              className="max-w-md"
              aria-describedby="email-help"
            />
            <p id="email-help" className="text-xs text-muted-foreground">
              {t("emailHelp")}
            </p>
          </div>

          {/* Save feedback */}
          {updateProfile.isSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("profileSaved")}
            </p>
          )}
          {updateProfile.isError && (
            <p className="text-sm text-destructive">
              {updateProfile.error.message}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {t("saveProfile")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Notification preferences section.
 *
 * @description Allows users to toggle email and in-app notifications,
 * and configure which events trigger notifications. Saves preferences
 * via tRPC updateNotificationPrefs mutation.
 */
function NotificationsSection() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);

  const updatePrefs = trpc.user.updateNotificationPrefs.useMutation();

  const eventKeys = [
    "notifyIssueAssigned",
    "notifyIssueMentioned",
    "notifyIssueUpdated",
    "notifyCommentAdded",
    "notifyStatusChanged",
    "notifyApprovalRequested",
    "notifySlaBreached",
  ] as const;

  const [eventToggles, setEventToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(eventKeys.map((key) => [key, true])),
  );

  const handleEventToggle = useCallback((key: string, checked: boolean) => {
    setEventToggles((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const handleSave = useCallback(() => {
    updatePrefs.mutate({
      emailEnabled,
      inAppEnabled,
    });
  }, [updatePrefs, emailEnabled, inAppEnabled]);

  return (
    <div className="space-y-6">
      {/* Channel toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" aria-hidden="true" />
            {t("notifications")}
          </CardTitle>
          <CardDescription>{t("notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">{t("emailNotifications")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("emailNotificationsDesc")}
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app-notifications">{t("inAppNotifications")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("inAppNotificationsDesc")}
              </p>
            </div>
            <Switch
              id="in-app-notifications"
              checked={inAppEnabled}
              onCheckedChange={setInAppEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event-level toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("notificationEvents")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventKeys.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`event-${key}`} className="font-normal">
                {t(key)}
              </Label>
              <Switch
                id={`event-${key}`}
                checked={eventToggles[key] ?? true}
                onCheckedChange={(checked) => handleEventToggle(key, checked)}
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {updatePrefs.isSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("preferencesSaved")}
            </p>
          )}
          {updatePrefs.isError && (
            <p className="text-sm text-destructive">
              {updatePrefs.error.message}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={updatePrefs.isPending}
          >
            {updatePrefs.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {tc("save")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Appearance section with theme and language selectors.
 *
 * @description Provides theme toggle (light/dark/system) and language
 * selector. Theme changes are applied immediately to the document root.
 */
function AppearanceSection() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [theme, setTheme] = useState<string>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "system";
  });
  const [language, setLanguage] = useState("en");

  const handleThemeChange = useCallback((value: string) => {
    setTheme(value);
    if (value === "dark") {
      document.documentElement.classList.add("dark");
    } else if (value === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" aria-hidden="true" />
            {t("theme")}
          </CardTitle>
          <CardDescription>{t("themeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="theme-select">{t("theme")}</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme-select" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("lightMode")}</SelectItem>
                <SelectItem value="dark">{t("darkMode")}</SelectItem>
                <SelectItem value="system">{t("systemTheme")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
          <CardDescription>{t("languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="language-select">{t("selectLanguage")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language-select" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("english")}</SelectItem>
                <SelectItem value="es">{t("spanish")}</SelectItem>
                <SelectItem value="fr">{t("french")}</SelectItem>
                <SelectItem value="de">{t("german")}</SelectItem>
                <SelectItem value="ja">{t("japanese")}</SelectItem>
                <SelectItem value="pt-BR">{t("portugueseBr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button>{tc("save")}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * API token management section.
 *
 * @description Allows users to create, view, copy, and revoke personal
 * API tokens. New tokens are shown once and must be copied immediately.
 * Backed by tRPC listTokens, createApiToken, and revokeToken procedures.
 */
function ApiTokensSection() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: tokens, isLoading, error } = trpc.user.listTokens.useQuery({});

  const createToken = trpc.user.createApiToken.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.plainToken);
      setShowCreateForm(false);
      setNewTokenName("");
      setNewTokenExpiry("never");
      void utils.user.listTokens.invalidate();
    },
  });

  const revokeToken = trpc.user.revokeToken.useMutation({
    onSuccess: () => {
      void utils.user.listTokens.invalidate();
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiry, setNewTokenExpiry] = useState("never");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const handleCreateToken = useCallback(() => {
    const expiresInDays =
      newTokenExpiry === "never" ? undefined : parseInt(newTokenExpiry, 10);
    createToken.mutate({
      name: newTokenName,
      ...(expiresInDays !== undefined && { expiresInDays }),
    });
  }, [createToken, newTokenName, newTokenExpiry]);

  const handleRevokeToken = useCallback(
    (tokenId: string) => {
      revokeToken.mutate({ tokenId });
    },
    [revokeToken],
  );

  const handleCopyToken = useCallback(() => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken).catch(() => {
        // Clipboard access denied
      });
    }
  }, [generatedToken]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <p className="text-sm">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tokenList = tokens ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="size-4" aria-hidden="true" />
                {t("apiTokens")}
              </CardTitle>
              <CardDescription>{t("apiTokensDesc")}</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
            >
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("createToken")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generated token alert */}
          {generatedToken && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
                {t("tokenCreated")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-green-100 px-2 py-1 font-mono text-sm dark:bg-green-900">
                  {showToken ? generatedToken : generatedToken.replace(/./g, "*")}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                  aria-label={showToken ? tc("showLess") : tc("showMore")}
                  className="size-8"
                >
                  {showToken ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyToken}
                  aria-label={t("copyToken")}
                  className="size-8"
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Create token form */}
          {showCreateForm && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="grid gap-2">
                <Label htmlFor="token-name">{t("tokenName")}</Label>
                <Input
                  id="token-name"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder={t("tokenNamePlaceholder")}
                  className="max-w-md"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token-expiry">{t("tokenExpiry")}</Label>
                <Select value={newTokenExpiry} onValueChange={setNewTokenExpiry}>
                  <SelectTrigger id="token-expiry" className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t("tokenExpiryNever")}</SelectItem>
                    <SelectItem value="30">{t("tokenExpiry30")}</SelectItem>
                    <SelectItem value="60">{t("tokenExpiry60")}</SelectItem>
                    <SelectItem value="90">{t("tokenExpiry90")}</SelectItem>
                    <SelectItem value="365">{t("tokenExpiry365")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createToken.isError && (
                <p className="text-sm text-destructive">
                  {createToken.error.message}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateToken}
                  disabled={!newTokenName.trim() || createToken.isPending}
                >
                  {createToken.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  )}
                  {t("createToken")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTokenName("");
                  }}
                >
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          )}

          {/* Token list */}
          {tokenList.length === 0 && !showCreateForm && !generatedToken && (
            <div className="py-8 text-center">
              <Key
                className="mx-auto mb-3 size-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium text-foreground">{t("noTokens")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("noTokensDesc")}
              </p>
            </div>
          )}

          {tokenList.length > 0 && (
            <div className="divide-y">
              {tokenList.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{token.name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>
                        {t("tokenLastUsed")}:{" "}
                        {token.lastUsedAt
                          ? new Intl.DateTimeFormat().format(
                              new Date(token.lastUsedAt),
                            )
                          : t("tokenNeverUsed")}
                      </span>
                      {token.expiresAt ? (
                        <Badge variant="outline" className="text-xs">
                          {t("tokenExpiresAt", {
                            date: new Intl.DateTimeFormat().format(
                              new Date(token.expiresAt),
                            ),
                          })}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t("tokenNoExpiry")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRevokeToken(token.id)}
                    disabled={revokeToken.isPending}
                  >
                    {revokeToken.isPending ? (
                      <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="mr-1 size-4" aria-hidden="true" />
                    )}
                    {t("revokeToken")}
                  </Button>
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
 * Settings page with tabbed sections.
 *
 * @description Full settings page with Profile, Notifications, Appearance,
 * and API Tokens tabs. Uses shadcn/ui components with i18n translations.
 * Each section is a separate component for maintainability.
 */
export default function SettingsPage() {
  const t = useTranslations("settings");
  const tn = useTranslations("nav");

  return (
    <>
      <AppHeader breadcrumbs={[{ label: tn("settings") }]} />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Settings
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {tn("settings")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-1.5 size-4" aria-hidden="true" />
              {t("tabProfile")}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-1.5 size-4" aria-hidden="true" />
              {t("tabNotifications")}
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="mr-1.5 size-4" aria-hidden="true" />
              {t("tabAppearance")}
            </TabsTrigger>
            <TabsTrigger value="api-tokens">
              <Key className="mr-1.5 size-4" aria-hidden="true" />
              {t("tabApiTokens")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileSection />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsSection />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceSection />
          </TabsContent>

          <TabsContent value="api-tokens" className="mt-6">
            <ApiTokensSection />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/**
 * Admin system settings page.
 *
 * @description Provides sections for General (org name, timezone, language),
 * Security (2FA, session timeout), Email (SMTP settings), and Storage
 * (limits, cleanup) configuration.
 *
 * @module admin-system
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Save,
  Globe,
  Shield,
  Mail,
  HardDrive,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";

export default function AdminSystemPage() {
  const t = useTranslations("admin.system");
  const tc = useTranslations("common");

  // General settings
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");

  // Security settings
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("480");

  // Email settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromAddress, setFromAddress] = useState("");

  // Storage settings
  const [storageLimit, setStorageLimit] = useState("10");
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState("365");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" aria-hidden="true" />
            {t("general")}
          </CardTitle>
          <CardDescription>{t("generalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">{t("orgName")}</Label>
            <Input
              id="org-name"
              placeholder={t("orgNamePlaceholder")}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">{t("timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (US)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (US)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="language">{t("language")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Francais</SelectItem>
                <SelectItem value="es">Espanol</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button>
            <Save className="mr-2 size-4" aria-hidden="true" />
            {tc("save")}
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      {/* Security settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" aria-hidden="true" />
            {t("securitySection")}
          </CardTitle>
          <CardDescription>{t("securityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="two-factor"
              checked={twoFactor}
              onCheckedChange={setTwoFactor}
            />
            <Label htmlFor="two-factor">{t("twoFactor")}</Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="session-timeout">{t("sessionTimeout")}</Label>
            <Input
              id="session-timeout"
              type="number"
              min="5"
              max="10080"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button>
            <Save className="mr-2 size-4" aria-hidden="true" />
            {tc("save")}
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      {/* Email settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" aria-hidden="true" />
            {t("emailSection")}
          </CardTitle>
          <CardDescription>{t("emailDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="smtp-host">{t("smtpHost")}</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-port">{t("smtpPort")}</Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="smtp-user">{t("smtpUser")}</Label>
              <Input
                id="smtp-user"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-password">{t("smtpPassword")}</Label>
              <Input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="from-address">{t("fromAddress")}</Label>
            <Input
              id="from-address"
              type="email"
              placeholder="noreply@example.com"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button>
            <Save className="mr-2 size-4" aria-hidden="true" />
            {tc("save")}
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      {/* Storage settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-5" aria-hidden="true" />
            {t("storageSection")}
          </CardTitle>
          <CardDescription>{t("storageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="storage-limit">{t("storageLimit")}</Label>
            <Input
              id="storage-limit"
              type="number"
              min="1"
              value={storageLimit}
              onChange={(e) => setStorageLimit(e.target.value)}
              className="max-w-[200px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="auto-cleanup"
              checked={autoCleanup}
              onCheckedChange={setAutoCleanup}
            />
            <Label htmlFor="auto-cleanup">{t("autoCleanup")}</Label>
          </div>
          {autoCleanup && (
            <div className="grid gap-2">
              <Label htmlFor="cleanup-days">{t("cleanupDays")}</Label>
              <Input
                id="cleanup-days"
                type="number"
                min="30"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button>
            <Save className="mr-2 size-4" aria-hidden="true" />
            {tc("save")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Bell, Search, Moon, Sun, LogOut, User, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Badge } from "@/shared/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ActionTooltip } from "@/shared/components/action-tooltip";
import { trpc } from "@/shared/lib/trpc";

/**
 * Breadcrumb segment for the page header.
 */
export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  /** Breadcrumb path segments to display */
  breadcrumbs?: BreadcrumbSegment[];
}

/**
 * AppHeader renders the top bar of the authenticated app layout.
 *
 * @description Contains sidebar toggle, breadcrumbs, global search,
 * notification bell with unread count, theme toggle, and user avatar dropdown.
 * @param props - AppHeaderProps
 * @returns Header component
 *
 * @example
 * <AppHeader breadcrumbs={[{ label: "Issues", href: "/issues" }, { label: "PROJ-123" }]} />
 */
export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  // Fetch user profile for avatar
  const { data: profile } = trpc.user.getProfile.useQuery();
  const userInitials = profile?.name
    ? profile.name
        .split(" ")
        .map((p: string) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // Fetch unread notification count
  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, [theme]);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const displayCount = unreadCount ?? 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {/* Left: Sidebar toggle + Breadcrumbs */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <BreadcrumbItem key={crumb.label}>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <>
                        <BreadcrumbLink href={crumb.href ?? "#"}>
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator />
                      </>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      {/* Center: Global search */}
      <div className="mx-auto hidden w-full max-w-md md:block">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9 pr-4"
            aria-label={tc("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 md:hidden"
          aria-label={tc("search")}
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="size-4" aria-hidden="true" />
        </Button>

        {/* Mobile search sheet */}
        <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
          <SheetContent side="top" className="h-auto">
            <SheetHeader>
              <SheetTitle>{tc("search")}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder={t("searchPlaceholder")}
                  className="h-10 pl-9 pr-4"
                  aria-label={tc("search")}
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      setMobileSearchOpen(false);
                      router.push(
                        `/search?q=${encodeURIComponent(searchQuery.trim())}`,
                      );
                    }
                  }}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Theme toggle */}
        <ActionTooltip content={t("toggleTheme")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={t("toggleTheme")}
            className="size-9"
          >
            {theme === "light" ? (
              <Moon className="size-4" aria-hidden="true" />
            ) : (
              <Sun className="size-4" aria-hidden="true" />
            )}
          </Button>
        </ActionTooltip>

        {/* Notifications */}
        <ActionTooltip content={t("notifications")}>
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label={t("notifications")}
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
        </ActionTooltip>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-full"
              aria-label={t("userMenu")}
            >
              <Avatar className="size-8">
                <AvatarImage src={profile?.image ?? ""} alt={profile?.name ?? ""} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="mr-2 size-4" aria-hidden="true" />
                {t("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 size-4" aria-hidden="true" />
                {t("settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                document.cookie = "dev-user-id=; path=/; max-age=0";
                signOut({ callbackUrl: "/auth/signin" });
              }}
            >
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

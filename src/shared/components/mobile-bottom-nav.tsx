"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ListTodo, Columns3, Search, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home, matchPaths: ["/"] },
  { key: "issues", href: "/issues", icon: ListTodo, matchPaths: ["/issues"] },
  { key: "boards", href: "/boards", icon: Columns3, matchPaths: ["/boards"] },
  { key: "search", href: "/search", icon: Search, matchPaths: ["/search"] },
  { key: "more", href: "/admin", icon: MoreHorizontal, matchPaths: ["/admin", "/settings"] },
];

/**
 * Bottom tab navigation bar for mobile screens.
 *
 * @description Visible only on screens below md breakpoint (md:hidden).
 * Contains 5 tabs: Home, Issues, Boards, Search, More.
 */
export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("label")}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : item.matchPaths.some((p) => pathname.startsWith(p));
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

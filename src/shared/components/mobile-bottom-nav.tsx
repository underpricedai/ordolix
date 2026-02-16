"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ListTodo,
  Columns3,
  Search,
  MoreHorizontal,
  GanttChart,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths: string[];
}

const GLOBAL_NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home, matchPaths: ["/"] },
  { key: "issues", href: "/issues", icon: ListTodo, matchPaths: ["/issues"] },
  { key: "boards", href: "/boards", icon: Columns3, matchPaths: ["/boards"] },
  { key: "search", href: "/search", icon: Search, matchPaths: ["/search"] },
  { key: "more", href: "/admin", icon: MoreHorizontal, matchPaths: ["/admin", "/settings"] },
];

/**
 * Returns project-scoped mobile nav items for a given project key.
 */
function getProjectNavItems(projectKey: string): NavItem[] {
  const base = `/projects/${projectKey}`;
  return [
    { key: "boards", href: `${base}/board`, icon: Columns3, matchPaths: [`${base}/board`] },
    { key: "issues", href: `${base}/backlog`, icon: ListTodo, matchPaths: [`${base}/backlog`] },
    { key: "timeline", href: `${base}/timeline`, icon: GanttChart, matchPaths: [`${base}/timeline`] },
    { key: "search", href: "/search", icon: Search, matchPaths: ["/search"] },
    { key: "more", href: `${base}/settings`, icon: MoreHorizontal, matchPaths: [`${base}/settings`, `${base}/sprints`, `${base}/queue`, `${base}/reports`] },
  ];
}

/**
 * Extracts a project key from the pathname if in project context.
 */
function extractProjectKey(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Bottom tab navigation bar for mobile screens.
 *
 * @description Visible only on screens below md breakpoint (md:hidden).
 * Context-aware: switches to project-scoped items (Board, Backlog, Timeline,
 * Search, More) when navigating inside a project.
 */
export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const projectKey = extractProjectKey(pathname);

  const navItems = projectKey
    ? getProjectNavItems(projectKey)
    : GLOBAL_NAV_ITEMS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("label")}
    >
      {navItems.map((item) => {
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

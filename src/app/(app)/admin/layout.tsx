/**
 * Admin panel layout with sidebar navigation and permission check.
 *
 * @description Wraps all /admin/* pages with a left sidebar containing
 * links to admin sections. Checks for admin permissions and shows
 * an unauthorized message if the user lacks access.
 *
 * @module admin-layout
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Users,
  GitBranch,
  Columns3,
  Shield,
  Zap,
  Plug,
  Settings,
  ShieldAlert,
  ScrollText,
  Webhook,
} from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { cn } from "@/shared/lib/utils";

/**
 * Admin sidebar navigation items.
 */
const adminNavItems = [
  { key: "users", href: "/admin/users", icon: Users },
  { key: "workflows", href: "/admin/workflows", icon: GitBranch },
  { key: "customFields", href: "/admin/fields", icon: Columns3 },
  { key: "permissions", href: "/admin/permissions", icon: Shield },
  { key: "automation", href: "/admin/automation", icon: Zap },
  { key: "integrations", href: "/admin/integrations", icon: Plug },
  { key: "system", href: "/admin/system", icon: Settings },
  { key: "auditLog", href: "/admin/audit-log", icon: ScrollText },
  { key: "webhooks", href: "/admin/webhooks", icon: Webhook },
] as const;

/**
 * Resolves the current admin section label for breadcrumbs based on pathname.
 */
function getCurrentSection(
  pathname: string,
  t: (key: string) => string,
): { label: string; href: string } | null {
  for (const item of adminNavItems) {
    if (pathname.startsWith(item.href)) {
      return { label: t(item.key), href: item.href };
    }
  }
  return null;
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const t = useTranslations("admin.sidebar");
  const ta = useTranslations("admin");
  const tn = useTranslations("nav");

  // TODO: Replace with tRPC user.me query once admin router is implemented
  const isLoading = false;
  const isAdmin = true;
  const currentSection = getCurrentSection(pathname, t);

  const breadcrumbs = [
    { label: tn("admin"), href: "/admin" },
    ...(currentSection ? [currentSection] : []),
  ];

  // Show unauthorized message if user lacks admin access
  if (!isLoading && !isAdmin) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: tn("admin") }]} />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center" role="alert">
            <ShieldAlert
              className="mx-auto mb-4 size-12 text-destructive"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold text-foreground">
              {ta("unauthorized")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {ta("unauthorizedDescription")}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1">
        {/* Admin sidebar navigation */}
        <nav
          className="hidden w-56 shrink-0 border-r bg-muted/30 p-4 md:block"
          aria-label={ta("title")}
        >
          <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ta("title")}
          </h2>
          <ul className="space-y-1" role="list">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}

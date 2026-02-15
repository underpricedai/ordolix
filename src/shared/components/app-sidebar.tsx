"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Columns3,
  GanttChart,
  GitBranch,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/shared/components/ui/sidebar";

/**
 * Navigation item definition for the sidebar.
 */
interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

/**
 * Primary navigation items displayed in the sidebar.
 * Each item maps to a top-level route in the (app) layout group.
 */
const mainNavItems: NavItem[] = [
  { titleKey: "dashboard", href: "/", icon: LayoutDashboard },
  { titleKey: "projects", href: "/projects", icon: FolderKanban },
  { titleKey: "issues", href: "/issues", icon: ListTodo },
  { titleKey: "boards", href: "/boards", icon: Columns3 },
  { titleKey: "gantt", href: "/gantt", icon: GanttChart },
  { titleKey: "workflows", href: "/workflows", icon: GitBranch },
  { titleKey: "reports", href: "/reports", icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
  { titleKey: "admin", href: "/admin", icon: Shield },
  { titleKey: "settings", href: "/settings", icon: Settings },
];

/**
 * AppSidebar renders the main navigation sidebar for the authenticated app layout.
 *
 * @description Uses shadcn/ui Sidebar primitives with collapsible icon mode,
 * keyboard shortcut (Ctrl+B), active route highlighting, and i18n labels.
 *
 * @example
 * <SidebarProvider>
 *   <AppSidebar />
 *   <SidebarInset>{children}</SidebarInset>
 * </SidebarProvider>
 */
export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  /**
   * Determines if a nav item should be shown as active.
   * Dashboard is only active on exact match; others match prefix.
   */
  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" aria-label="Ordolix Home">
                <Image
                  src="/logo-icon.png"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0"
                  aria-hidden="true"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Ordolix</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("projectTracker")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={t(item.titleKey)}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" aria-hidden="true" />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={t(item.titleKey)}
                >
                  <Link href={item.href}>
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{t(item.titleKey)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

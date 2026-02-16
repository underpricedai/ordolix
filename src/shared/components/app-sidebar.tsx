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
  Star,
  Timer,
  Inbox,
  ChevronLeft,
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
import { Badge } from "@/shared/components/ui/badge";
import { trpc } from "@/shared/lib/trpc";

/**
 * Navigation item definition for the sidebar.
 */
interface NavItem {
  titleKey: string;
  namespace?: "nav" | "common";
  href: string;
  icon: React.ElementType;
}

/**
 * Primary navigation items displayed in the global sidebar.
 */
const mainNavItems: NavItem[] = [
  { titleKey: "dashboard", href: "/", icon: LayoutDashboard },
  { titleKey: "projects", href: "/projects", icon: FolderKanban },
  { titleKey: "issues", href: "/issues", icon: ListTodo },
  { titleKey: "boards", href: "/boards", icon: Columns3 },
  { titleKey: "gantt", href: "/gantt", icon: GanttChart },
  { titleKey: "workflows", href: "/workflows", icon: GitBranch },
  { titleKey: "reports", href: "/reports", icon: BarChart3 },
  { titleKey: "favorites", href: "/favorites", icon: Star },
];

const bottomNavItems: NavItem[] = [
  { titleKey: "admin", href: "/admin", icon: Shield },
  { titleKey: "settings", href: "/settings", icon: Settings },
];

/**
 * Extracts a project key from the pathname if the user is in a project context.
 * Matches /projects/[KEY] and /projects/[KEY]/*
 */
function extractProjectKey(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Returns project-scoped navigation items for a given project key.
 */
function getProjectNavItems(projectKey: string): NavItem[] {
  const base = `/projects/${projectKey}`;
  return [
    { titleKey: "overview", namespace: "common", href: base, icon: LayoutDashboard },
    { titleKey: "boards", href: `${base}/board`, icon: Columns3 },
    { titleKey: "backlog", href: `${base}/backlog`, icon: ListTodo },
    { titleKey: "timeline", href: `${base}/timeline`, icon: GanttChart },
    { titleKey: "sprints", href: `${base}/sprints`, icon: Timer },
    { titleKey: "queue", href: `${base}/queue`, icon: Inbox },
    { titleKey: "reports", href: `${base}/reports`, icon: BarChart3 },
  ];
}

/**
 * AppSidebar renders the main navigation sidebar for the authenticated app layout.
 *
 * @description Context-aware sidebar that switches between global navigation and
 * project-scoped navigation when the user navigates into a project (/projects/[key]/*).
 * Uses shadcn/ui Sidebar primitives with collapsible icon mode,
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
  const tc = useTranslations("common");
  const projectKey = extractProjectKey(pathname);

  // Fetch project name when inside a project context
  const { data: project } = trpc.project.getByKey.useQuery(
    { key: projectKey! },
    { enabled: !!projectKey },
  );

  /**
   * Determines if a nav item should be shown as active.
   * Dashboard / project overview are only active on exact match; others match prefix.
   */
  function isActive(href: string): boolean {
    if (href === "/" || (projectKey && href === `/projects/${projectKey}`)) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  /** Resolve the i18n label for a nav item */
  function getLabel(item: NavItem): string {
    return item.namespace === "common" ? tc(item.titleKey) : t(item.titleKey);
  }

  // Project-scoped sidebar
  if (projectKey) {
    const projectNavItems = getProjectNavItems(projectKey);
    const projectName = project?.name ?? projectKey.toUpperCase();

    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip={t("backToProjects")}>
                <Link href="/projects">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderKanban className="size-4" aria-hidden="true" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{projectName}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <ChevronLeft className="size-3" aria-hidden="true" />
                      {t("backToProjects")}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("projectNav")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const label = getLabel(item);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                      >
                        <Link href={item.href}>
                          <Icon className="size-4" aria-hidden="true" />
                          <span>{label}</span>
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive(`/projects/${projectKey}/settings`)}
                tooltip={t("settings")}
              >
                <Link href={`/projects/${projectKey}/settings`}>
                  <Settings className="size-4" aria-hidden="true" />
                  <span>{t("settings")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    );
  }

  // Global sidebar (default)
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

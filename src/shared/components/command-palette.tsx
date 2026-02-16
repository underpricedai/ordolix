"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Columns3,
  GanttChart,
  Search,
  Settings,
  Shield,
  Plus,
  FolderKanban,
  Moon,
  Loader2,
  CircleDot,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { trpc } from "@/shared/lib/trpc";

/**
 * Navigation page definition for the command palette.
 */
interface NavigationPage {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

/**
 * Action definition for the command palette.
 */
interface CommandAction {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  action: () => void;
}

/**
 * Navigation pages shown in the command palette.
 */
const NAVIGATION_PAGES: NavigationPage[] = [
  { id: "nav-dashboard", labelKey: "dashboard", href: "/", icon: LayoutDashboard },
  { id: "nav-boards", labelKey: "boards", href: "/boards", icon: Columns3 },
  { id: "nav-gantt", labelKey: "gantt", href: "/gantt", icon: GanttChart },
  { id: "nav-search", labelKey: "search", href: "/search", icon: Search },
  { id: "nav-settings", labelKey: "settings", href: "/settings", icon: Settings },
  { id: "nav-admin", labelKey: "admin", href: "/admin", icon: Shield },
];

/**
 * CommandPalette provides a global Cmd+K / Ctrl+K search interface.
 *
 * @description Searches across issues, projects, navigation pages, and actions.
 * Uses the search.quickSearch tRPC endpoint for live search with 300ms debounce.
 * Results are grouped into sections: Issues, Projects, Navigation, Actions.
 *
 * @example
 * <CommandPalette />
 */
export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  // Register Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  // Fetch search results via tRPC quickSearch
  const shouldSearch = debouncedSearch.length >= 1;
  const { data: searchResults, isLoading } = trpc.search.quickSearch.useQuery(
    { term: debouncedSearch, limit: 10 },
    { enabled: shouldSearch && open },
  );

  // Filter navigation pages based on search term
  const filteredNavigation = useMemo(() => {
    if (!search) return NAVIGATION_PAGES;
    const lower = search.toLowerCase();
    return NAVIGATION_PAGES.filter((page) => {
      const label = tNav(page.labelKey as Parameters<typeof tNav>[0]).toLowerCase();
      return label.includes(lower);
    });
  }, [search, tNav]);

  // Theme toggle action
  const toggleTheme = useCallback(() => {
    document.documentElement.classList.toggle("dark");
    setOpen(false);
  }, []);

  // Define actions
  const actions: CommandAction[] = useMemo(
    () => [
      {
        id: "action-create-issue",
        labelKey: "createIssue",
        icon: Plus,
        action: () => {
          setOpen(false);
          router.push("/issues?create=true");
        },
      },
      {
        id: "action-create-project",
        labelKey: "createProject",
        icon: FolderKanban,
        action: () => {
          setOpen(false);
          router.push("/projects?create=true");
        },
      },
      {
        id: "action-toggle-theme",
        labelKey: "toggleTheme",
        icon: Moon,
        action: toggleTheme,
      },
      {
        id: "action-go-to-admin",
        labelKey: "goToAdmin",
        icon: Shield,
        action: () => {
          setOpen(false);
          router.push("/admin");
        },
      },
      {
        id: "action-open-search",
        labelKey: "openSearch",
        icon: Search,
        action: () => {
          setOpen(false);
          router.push("/search");
        },
      },
    ],
    [router, toggleTheme],
  );

  // Filter actions based on search term
  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const lower = search.toLowerCase();
    return actions.filter((action) => {
      const label = t(`actions.${action.labelKey}` as Parameters<typeof t>[0]).toLowerCase();
      return label.includes(lower);
    });
  }, [search, actions, t]);

  // Handle selecting an issue result
  const handleSelectIssue = useCallback(
    (projectKey: string, issueKey: string) => {
      setOpen(false);
      router.push(`/projects/${projectKey}/issues/${issueKey}`);
    },
    [router],
  );

  // Handle selecting a project result
  const handleSelectProject = useCallback(
    (projectKey: string) => {
      setOpen(false);
      router.push(`/projects/${projectKey}`);
    },
    [router],
  );

  // Handle selecting a navigation page
  const handleSelectNavigation = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const issues = searchResults?.issues ?? [];
  const projects = searchResults?.projects ?? [];
  const hasIssues = issues.length > 0;
  const hasProjects = projects.length > 0;
  const hasSearchResults = hasIssues || hasProjects;
  const hasNavigation = filteredNavigation.length > 0;
  const hasActions = filteredActions.length > 0;
  const hasAnyResults = hasSearchResults || hasNavigation || hasActions;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("placeholder")}
      description={t("placeholder")}
      showCloseButton={false}
    >
      <CommandInput
        placeholder={t("placeholder")}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {/* Loading state */}
        {isLoading && shouldSearch && (
          <div className="flex items-center justify-center py-6" role="status">
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">{t("placeholder")}</span>
          </div>
        )}

        {/* No results */}
        {!isLoading && !hasAnyResults && search.length > 0 && (
          <CommandEmpty>{t("noResults")}</CommandEmpty>
        )}

        {/* Issues */}
        {hasIssues && (
          <CommandGroup heading={t("groups.issues")}>
            {issues.map((issue) => (
              <CommandItem
                key={issue.id}
                value={`issue-${issue.key}-${issue.summary}`}
                onSelect={() =>
                  handleSelectIssue(
                    issue.project?.key ?? "",
                    issue.key,
                  )
                }
              >
                <CircleDot
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="font-semibold">{issue.key}</span>
                <span className="truncate text-muted-foreground">
                  {issue.summary}
                </span>
                {issue.status && (
                  <span className="ml-auto shrink-0">
                    <StatusBadge
                      name={issue.status.name}
                      category={
                        (issue.status.category as StatusCategory) ?? "TO_DO"
                      }
                    />
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Projects */}
        {hasIssues && hasProjects && <CommandSeparator />}
        {hasProjects && (
          <CommandGroup heading={t("groups.projects")}>
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.key}-${project.name}`}
                onSelect={() => handleSelectProject(project.key)}
              >
                <FolderKanban
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="font-semibold">{project.key}</span>
                <span className="truncate text-muted-foreground">
                  {project.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        {(hasSearchResults || hasProjects) && hasNavigation && (
          <CommandSeparator />
        )}
        {hasNavigation && (
          <CommandGroup heading={t("groups.navigation")}>
            {filteredNavigation.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.id}
                  value={`nav-${page.id}-${tNav(page.labelKey as Parameters<typeof tNav>[0])}`}
                  onSelect={() => handleSelectNavigation(page.href)}
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>{tNav(page.labelKey as Parameters<typeof tNav>[0])}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Actions */}
        {hasActions && (hasSearchResults || hasNavigation) && (
          <CommandSeparator />
        )}
        {hasActions && (
          <CommandGroup heading={t("groups.actions")}>
            {filteredActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  value={`action-${action.id}-${t(`actions.${action.labelKey}` as Parameters<typeof t>[0])}`}
                  onSelect={action.action}
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>
                    {t(`actions.${action.labelKey}` as Parameters<typeof t>[0])}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Opens the command palette programmatically.
 *
 * @description Dispatches a synthetic Cmd+K keyboard event to trigger
 * the command palette's global keyboard listener.
 */
export function openCommandPalette() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    }),
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";
import { ShortcutsDialog } from "@/shared/components/shortcuts-dialog";
import type { Shortcut } from "@/shared/providers/shortcuts-provider";

/**
 * Registers global keyboard shortcuts and renders the shortcuts help dialog.
 *
 * @description This component should be rendered once inside the app layout,
 * within a ShortcutsProvider. It registers Jira-like keyboard shortcuts for
 * navigation and actions, and manages the "?" help dialog.
 *
 * Shortcuts registered:
 * - `c` — Create issue (navigates to new issue page)
 * - `g b` — Go to Board
 * - `g d` — Go to Dashboard
 * - `g s` — Go to Search
 * - `g p` — Go to Projects
 * - `g i` — Go to Issues
 * - `g t` — Go to Timeline/Gantt
 * - `/` — Focus search input
 * - `?` — Show shortcuts help dialog
 * - `Escape` — Close any open dialog/panel
 */
export function AppShortcuts() {
  const router = useRouter();
  const t = useTranslations("shortcuts");
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        key: "c",
        description: t("createIssue"),
        handler: () => {
          // Dispatch a custom event that the create issue dialog can listen for
          window.dispatchEvent(new CustomEvent("ordolix:create-issue"));
        },
        scope: "global" as const,
      },
      {
        key: "g b",
        description: t("goToBoard"),
        handler: () => router.push("/board"),
        scope: "global" as const,
      },
      {
        key: "g d",
        description: t("goToDashboard"),
        handler: () => router.push("/dashboards"),
        scope: "global" as const,
      },
      {
        key: "g s",
        description: t("goToSearch"),
        handler: () => router.push("/search"),
        scope: "global" as const,
      },
      {
        key: "g p",
        description: t("goToProjects"),
        handler: () => router.push("/projects"),
        scope: "global" as const,
      },
      {
        key: "g i",
        description: t("goToIssues"),
        handler: () => router.push("/issues"),
        scope: "global" as const,
      },
      {
        key: "g t",
        description: t("goToTimeline"),
        handler: () => router.push("/timeline"),
        scope: "global" as const,
      },
      {
        key: "/",
        description: t("focusSearch"),
        handler: () => {
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-slot="search-input"], [role="searchbox"], input[type="search"]',
          );
          searchInput?.focus();
        },
        scope: "global" as const,
      },
      {
        key: "?",
        description: t("showShortcuts"),
        handler: () => setShowHelp(true),
        scope: "global" as const,
      },
      {
        key: "Escape",
        description: t("closeDialog"),
        handler: () => {
          setShowHelp(false);
          // Dispatch a custom event for other dialogs to listen for
          window.dispatchEvent(new CustomEvent("ordolix:close-dialog"));
        },
        scope: "global" as const,
      },
    ],
    [router, t],
  );

  useKeyboardShortcuts(shortcuts);

  return <ShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />;
}

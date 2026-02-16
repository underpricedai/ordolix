"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { useShortcutsContext, type Shortcut } from "@/shared/providers/shortcuts-provider";

/**
 * Categorized shortcut groups for the help dialog display.
 */
interface ShortcutCategory {
  label: string;
  shortcuts: Shortcut[];
}

/**
 * Formats a shortcut key for display in kbd tags.
 *
 * @param shortcut - The shortcut to format
 * @returns Array of key labels to render as individual kbd elements
 */
function formatKeys(shortcut: Shortcut): string[] {
  const parts: string[] = [];

  if (shortcut.modifier) {
    const modifierLabels: Record<string, string> = {
      meta: navigator?.platform?.includes("Mac") ? "\u2318" : "Ctrl",
      ctrl: "Ctrl",
      shift: "Shift",
      alt: navigator?.platform?.includes("Mac") ? "\u2325" : "Alt",
    };
    parts.push(modifierLabels[shortcut.modifier] ?? shortcut.modifier);
  }

  const keys = shortcut.key.split(" ");
  parts.push(...keys.map((k) => k.toUpperCase()));

  return parts;
}

/**
 * Categorizes shortcuts into Navigation, Actions, and Views groups.
 */
function categorizeShortcuts(
  shortcuts: Shortcut[],
  t: ReturnType<typeof useTranslations>,
): ShortcutCategory[] {
  const navigation: Shortcut[] = [];
  const actions: Shortcut[] = [];
  const views: Shortcut[] = [];

  for (const shortcut of shortcuts) {
    if (shortcut.key.startsWith("g ") || shortcut.key === "/") {
      navigation.push(shortcut);
    } else if (
      shortcut.key === "?" ||
      shortcut.key === "Escape"
    ) {
      views.push(shortcut);
    } else {
      actions.push(shortcut);
    }
  }

  const categories: ShortcutCategory[] = [];
  if (navigation.length > 0) {
    categories.push({
      label: t("categories.navigation"),
      shortcuts: navigation,
    });
  }
  if (actions.length > 0) {
    categories.push({
      label: t("categories.actions"),
      shortcuts: actions,
    });
  }
  if (views.length > 0) {
    categories.push({
      label: t("categories.views"),
      shortcuts: views,
    });
  }

  return categories;
}

interface ShortcutsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog showing all registered keyboard shortcuts grouped by category.
 *
 * @description Triggered by the "?" key. Displays shortcuts in a responsive
 * grid with styled kbd tags for key combinations. Groups shortcuts into
 * Navigation, Actions, and Views categories.
 *
 * @example
 * ```tsx
 * <ShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />
 * ```
 */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const t = useTranslations("shortcuts");
  const { getShortcuts } = useShortcutsContext();
  const shortcuts = getShortcuts();
  const categories = categorizeShortcuts(shortcuts, t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg md:max-w-2xl"
        aria-labelledby="shortcuts-dialog-title"
      >
        <DialogHeader>
          <DialogTitle id="shortcuts-dialog-title">{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("title")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category.label}>
              <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                {category.label}
              </h3>
              <ul className="space-y-2" role="list">
                {category.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {formatKeys(shortcut).map((keyLabel, i) => (
                        <kbd
                          key={i}
                          className="bg-muted text-muted-foreground inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-xs font-medium"
                        >
                          {keyLabel}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center text-sm">
              {t("title")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

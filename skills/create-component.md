# Skill: Create Component

Scaffolds a React component following Ordolix patterns (shadcn/ui, Tailwind, i18n, accessibility).

## Usage

```
/create-component <ComponentName> [--module <module>] [--type <type>]
```

- `ComponentName`: PascalCase name (e.g., `IssueCard`, `SprintProgress`)
- `--module`: Target module under `src/modules/` (default: inferred from name or prompted)
- `--type`: Component type: `page`, `form`, `list`, `detail`, `dialog`, `widget` (default: `page`)

## Instructions

### 1. Determine File Location

Place the component at:
```
src/modules/<module>/components/<ComponentName>.tsx
```

Create the test file at:
```
src/modules/<module>/components/<ComponentName>.test.tsx
```

If `--module` is not specified, ask the user which module to use.

### 2. Generate Component by Type

#### Type: `page` (default)

A full-page component with header, content area, and empty state:

```tsx
"use client";

import { useTranslations } from "next-intl";

/**
 * <ComponentName> page component.
 *
 * @description <Brief description>.
 * @module <module-name>
 */
export function <ComponentName>() {
  const t = useTranslations("<moduleName>");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>
      </div>
      <div>
        {/* Content */}
      </div>
    </div>
  );
}
```

#### Type: `form`

A form component with Zod validation and shadcn/ui form controls:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * <ComponentName> form component.
 *
 * @description <Brief description>.
 * @module <module-name>
 */
export function <ComponentName>({ onSubmit }: { onSubmit: (data: unknown) => void }) {
  const t = useTranslations("<moduleName>");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({}); }} className="space-y-4">
      {/* Form fields */}
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
```

#### Type: `list`

A list/table component with search, filters, and empty state:

```tsx
"use client";

import { useTranslations } from "next-intl";

/**
 * <ComponentName> list component.
 *
 * @description Displays a filterable list of <items>.
 * @module <module-name>
 */
export function <ComponentName>({ items = [] }: { items?: unknown[] }) {
  const t = useTranslations("<moduleName>");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List content */}
    </div>
  );
}
```

#### Type: `detail`

A detail view component showing a single entity:

```tsx
"use client";

import { useTranslations } from "next-intl";

/**
 * <ComponentName> detail component.
 *
 * @description Displays detailed view of a single <entity>.
 * @module <module-name>
 */
export function <ComponentName>({ id }: { id: string }) {
  const t = useTranslations("<moduleName>");

  return (
    <div className="space-y-6">
      {/* Detail content */}
    </div>
  );
}
```

#### Type: `dialog`

A modal dialog using shadcn/ui Dialog:

```tsx
"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/**
 * <ComponentName> dialog component.
 *
 * @description Modal dialog for <action>.
 * @module <module-name>
 */
export function <ComponentName>({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("<moduleName>");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Generate Test File

```tsx
import { describe, it, expect } from "vitest";

/**
 * Tests for <ComponentName>.
 */
describe("<ComponentName>", () => {
  it.todo("should render without crashing");
  it.todo("should display translated text");
  it.todo("should be accessible (ARIA)");
});
```

### 4. Add i18n Keys

Check if the module's i18n namespace exists in `src/messages/en.json`. If keys referenced by the component are missing, add them.

### 5. Summary

After creation, output:
- Files created (component + test)
- i18n keys added (if any)
- Suggested next steps (wire to page, add tRPC query, etc.)

## Cross-Cutting Requirements

Every generated component must follow:

- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, 4.5:1 contrast ratio
- **i18n**: All strings via `t()` from `useTranslations()`, never hardcoded
- **Dark mode**: Use Tailwind CSS variable classes (`text-foreground`, `bg-background`, etc.)
- **Styling**: Tailwind utility classes only. shadcn/ui components for interactive elements
- **TypeScript**: Props interface with JSDoc. No `any` types.
- **Component naming**: PascalCase export matching filename

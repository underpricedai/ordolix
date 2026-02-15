# Skill: Create Page

Scaffolds a Next.js App Router page with proper async params, layouts, loading, and error states.

## Usage

```
/create-page <route-path> [--layout] [--loading] [--error]
```

- `route-path`: The URL path (e.g., `/settings/security`, `/[projectKey]/releases`)
- `--layout`: Also generate a `layout.tsx` file
- `--loading`: Also generate a `loading.tsx` file with skeleton UI
- `--error`: Also generate an `error.tsx` file with error boundary

## Instructions

### 1. Determine File Path

Convert the route path to the App Router directory structure:

| Route Path | File Path |
|------------|-----------|
| `/settings/security` | `src/app/settings/security/page.tsx` |
| `/[projectKey]/releases` | `src/app/[projectKey]/releases/page.tsx` |
| `/admin/webhooks` | `src/app/admin/webhooks/page.tsx` |

### 2. Generate the Page File

Pages in Ordolix are **thin wrappers** that compose module components. They should NOT contain business logic.

**Server component page (default):**

```tsx
import type { Metadata } from "next";
import { <ModuleComponent> } from "@/modules/<module>/components/<ModuleComponent>";

/**
 * <PageTitle> page.
 *
 * @description <Brief description>.
 * @module app-<route-slug>
 */

export const metadata: Metadata = {
  title: "<PageTitle> | Ordolix",
  description: "<Page description for SEO>",
};

export default function <PageName>Page() {
  return <<ModuleComponent> />;
}
```

**Page with dynamic params (e.g., `[projectKey]`):**

```tsx
import type { Metadata } from "next";
import { <ModuleComponent> } from "@/modules/<module>/components/<ModuleComponent>";

export const metadata: Metadata = {
  title: "<PageTitle> | Ordolix",
};

export default async function <PageName>Page({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  return <<ModuleComponent> projectKey={projectKey} />;
}
```

**Important:** In Next.js 15+, `params` is a `Promise` and must be `await`ed. The page function must be `async`.

### 3. Generate Layout (if `--layout`)

```tsx
/**
 * Layout for <section>.
 *
 * @description Provides shared UI (sidebar, breadcrumbs) for <section> pages.
 * @module app-<route-slug>-layout
 */
export default function <SectionName>Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      {children}
    </div>
  );
}
```

### 4. Generate Loading State (if `--loading`)

```tsx
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for <section>.
 *
 * @description Displays skeleton UI while the page data loads.
 */
export default function <SectionName>Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
```

### 5. Generate Error Boundary (if `--error`)

```tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * Error boundary for <section>.
 *
 * @description Catches and displays errors for <section> pages.
 */
export default function <SectionName>Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[<SectionName>Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button onClick={reset}>{t("tryAgain")}</Button>
      </div>
    </div>
  );
}
```

### 6. Summary

After creation, output:
- Files created
- Route path registered
- Suggested next steps (create module component, add nav link, add i18n keys)

## Key Patterns

- Pages are **thin**: fetch data and compose module components
- **Server components** by default; add `"use client"` only for interactivity
- **Metadata**: Always export `metadata` for SEO
- **Async params**: In Next.js 15+, `params` is `Promise<{}>` and must be `await`ed
- **Loading states**: Use `Skeleton` from shadcn/ui, never blank screens
- **Error boundaries**: Always use `useTranslations("errors")` for i18n-safe error messages
- **No business logic** in page files — delegate to module components and tRPC

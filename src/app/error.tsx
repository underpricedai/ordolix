"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * Root error boundary for the application.
 *
 * @description Catches unhandled errors at the root layout level.
 * Shows an error message with both a retry button and a link to
 * navigate back to the dashboard.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="size-8 text-destructive"
            aria-hidden="true"
          />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>
            {t("tryAgain")}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * App-level error boundary for the authenticated (app) route group.
 *
 * @description Catches unhandled errors in any page under the (app) layout.
 * Displays the error message with a retry button that calls Next.js reset()
 * to re-render the segment.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
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
        <Button onClick={reset}>
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}

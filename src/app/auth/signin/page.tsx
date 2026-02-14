/**
 * Sign-in page for Azure AD SSO authentication.
 *
 * @description Displays organization branding (logo, name) and an
 * Azure AD SSO button. Shows error messages for auth failures.
 *
 * @module auth-signin
 */
"use client";

import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/**
 * Inner component that reads search params (must be wrapped in Suspense).
 */
function SignInForm() {
  const t = useTranslations("signIn");

  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [isLoading, setIsLoading] = useState(false);

  function handleSignIn() {
    setIsLoading(true);
    // In production, this would call signIn("azure-ad") from next-auth
    // For now, redirect to the app
    window.location.href = "/";
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {/* Organization branding area */}
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <span className="text-2xl font-bold" aria-hidden="true">
            O
          </span>
        </div>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {errorParam && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {t("authError")}
          </div>
        )}

        {/* Azure AD SSO button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2
              className="mr-2 size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Shield className="mr-2 size-4" aria-hidden="true" />
          )}
          {isLoading ? t("signingIn") : t("ssoButton")}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {t("noAccount")}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}

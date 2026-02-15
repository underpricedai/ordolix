/**
 * Sign-in page with dev user picker and Azure AD SSO.
 *
 * @description In development mode, shows a list of seeded users to sign in as.
 * In production, shows the Azure AD SSO button.
 *
 * @module auth-signin
 */
"use client";

import { useState, Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Shield, Loader2, User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

interface DevUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Dev user picker: fetches seeded users and allows selecting one to sign in as.
 */
function DevUserPicker() {
  const t = useTranslations("signIn");
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dev/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: if dev endpoint doesn't exist, use a simple redirect
        setLoading(false);
      });
  }, []);

  function handleDevSignIn(userId: string) {
    setSigningIn(userId);
    // Set a cookie with the dev user ID and redirect
    document.cookie = `dev-user-id=${userId}; path=/; max-age=86400; SameSite=Lax`;
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    // No seeded users found, fall back to simple redirect
    return (
      <Button className="w-full" size="lg" onClick={() => { window.location.href = "/"; }}>
        <Shield className="mr-2 size-4" aria-hidden="true" />
        {t("devSignIn")}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">{t("devPickUser")}</p>
      {users.map((user) => (
        <Button
          key={user.id}
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => handleDevSignIn(user.id)}
          disabled={signingIn !== null}
        >
          {signingIn === user.id ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <User className="size-4" aria-hidden="true" />
          )}
          <div className="flex flex-1 items-center justify-between">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
        </Button>
      ))}
    </div>
  );
}

/**
 * Inner component that reads search params (must be wrapped in Suspense).
 */
function SignInForm() {
  const t = useTranslations("signIn");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  function handleSignIn() {
    setIsLoading(true);
    // In production, this would call signIn("azure-ad") from next-auth
    window.location.href = "/";
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <span className="text-2xl font-bold" aria-hidden="true">
            O
          </span>
        </div>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorParam && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {t("authError")}
          </div>
        )}

        {isDev ? (
          <DevUserPicker />
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Shield className="mr-2 size-4" aria-hidden="true" />
            )}
            {isLoading ? t("signingIn") : t("ssoButton")}
          </Button>
        )}

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

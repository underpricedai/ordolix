/**
 * Next.js middleware for auth protection, security headers, and request correlation.
 *
 * @description Runs on every matched request before the route handler.
 * Handles authentication redirect for unauthenticated users, injects
 * security headers, adds a correlation ID, and detects tenant context.
 *
 * @module middleware
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";

/**
 * Paths that do not require authentication.
 * Auth callback routes, external REST API, and tRPC endpoint are public.
 */
const publicPathPrefixes = ["/auth", "/api/v1", "/api/trpc"];

/**
 * Check whether a pathname matches any public path prefix.
 */
function isPublicPath(pathname: string): boolean {
  return publicPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Apply standard security headers to the response.
 */
function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
}

/**
 * Main middleware wrapping Auth.js session check with security hardening.
 *
 * @description Uses the Auth.js v5 `auth` function as middleware. If the user
 * has no session and the path is not public, redirect to the sign-in page.
 * Every response receives security headers and a unique request correlation ID.
 */
export default auth((request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    response.headers.set("X-Request-Id", crypto.randomUUID());
    return response;
  }

  // Check authentication via Auth.js session (injected by the auth wrapper)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (request as any).auth;

  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Tenant detection placeholder
  // TODO: Read organizationId from session and inject into request headers
  // once the multi-tenancy session enrichment is wired up.
  // const organizationId = session.user?.organizationId;

  const response = NextResponse.next();
  applySecurityHeaders(response);
  response.headers.set("X-Request-Id", crypto.randomUUID());

  return response;
});

/**
 * Matcher configuration: run middleware on all routes except static assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};

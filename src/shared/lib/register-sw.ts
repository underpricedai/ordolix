/**
 * Service Worker registration for PWA support.
 *
 * @description Registers /sw.js in production environments only.
 * In development, service workers are skipped to avoid caching issues.
 * Call this once on app mount (e.g., in root layout via ServiceWorkerRegistrar).
 *
 * @example
 *   // In a client component:
 *   useEffect(() => { registerSW(); }, []);
 */
export function registerSW(): void {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    process.env.NODE_ENV === "production"
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service worker registration failed — app works without it
      });
    });
  }
}

/** Alias for {@link registerSW}. */
export const registerServiceWorker = registerSW;

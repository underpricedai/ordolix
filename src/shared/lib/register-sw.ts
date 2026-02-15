/**
 * Registers the service worker for PWA support.
 *
 * @description Registers /sw.js in production environments.
 * Call this once on app mount (e.g., in root layout).
 */
export function registerSW() {
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

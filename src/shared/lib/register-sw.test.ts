import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Stores the "load" event handler registered by registerSW. */
let loadHandler: (() => void) | null = null;

function captureLoadListener() {
  loadHandler = null;
  vi.spyOn(window, "addEventListener").mockImplementation(
    (event: string, handler: unknown) => {
      if (event === "load") {
        loadHandler = handler as () => void;
      }
    },
  );
}

function createMockNavigator(hasServiceWorker: boolean) {
  const registerMock = vi.fn().mockResolvedValue(undefined);
  if (hasServiceWorker) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      writable: true,
      configurable: true,
    });
  } else {
    // Delete the property entirely so `"serviceWorker" in navigator` is false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker;
  }
  return registerMock;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("register-sw", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    loadHandler = null;
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalEnv ?? "test");
  });

  describe("registerSW", () => {
    it("registers the service worker in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const registerMock = createMockNavigator(true);
      captureLoadListener();

      const { registerSW } = await import("./register-sw");
      registerSW();

      // The "load" listener should have been attached
      expect(window.addEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );

      // Simulate the load event
      expect(loadHandler).not.toBeNull();
      loadHandler!();

      expect(registerMock).toHaveBeenCalledWith("/sw.js");
    });

    it("does NOT register the service worker in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      createMockNavigator(true);
      captureLoadListener();

      const { registerSW } = await import("./register-sw");
      registerSW();

      expect(loadHandler).toBeNull();
    });

    it("does NOT register when navigator.serviceWorker is unavailable", async () => {
      vi.stubEnv("NODE_ENV", "production");
      createMockNavigator(false);
      captureLoadListener();

      const { registerSW } = await import("./register-sw");
      registerSW();

      expect(loadHandler).toBeNull();
    });

    it("silently catches registration errors", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const registerMock = createMockNavigator(true);
      registerMock.mockRejectedValue(new Error("SW registration failed"));
      captureLoadListener();

      const { registerSW } = await import("./register-sw");
      registerSW();

      expect(loadHandler).not.toBeNull();

      // Should not throw
      await expect(
        Promise.resolve().then(() => loadHandler!()),
      ).resolves.not.toThrow();
    });
  });

  describe("registerServiceWorker alias", () => {
    it("is the same function as registerSW", async () => {
      const mod = await import("./register-sw");
      expect(mod.registerServiceWorker).toBe(mod.registerSW);
    });
  });
});

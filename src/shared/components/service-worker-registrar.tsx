"use client";

import { useEffect } from "react";
import { registerSW } from "@/shared/lib/register-sw";

/**
 * Client component that registers the service worker on mount.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerSW();
  }, []);
  return null;
}

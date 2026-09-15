import { lazy } from "react";

// 🛡️ Resilient dynamic loader that auto-recovers from stale chunks after new builds
export function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && typeof window !== "undefined") {
        const reloadKey = "chunk_retry_" + window.location.pathname;
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

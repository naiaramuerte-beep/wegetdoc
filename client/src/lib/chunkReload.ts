// Stale-chunk recovery: after a deploy, users with an old tab open hit
// "Failed to fetch dynamically imported module" when navigating to a route
// whose chunk hash changed. Reload once to pick up the fresh manifest.
// 30s cooldown prevents reload loops if the new bundle ALSO fails (e.g.
// CDN propagation lag, server outage masquerading as a chunk error).

const RELOAD_TS_KEY = "vite-chunk-reload-ts";

function maybeReload(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

function looksLikeChunkError(message: string): boolean {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk")
  );
}

export function isChunkErrorMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  return looksLikeChunkError(message);
}

export function installChunkErrorRecovery(): void {
  window.addEventListener("vite:preloadError", (e: Event) => {
    e.preventDefault();
    maybeReload();
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason as unknown;
    const msg = String(
      (reason as { message?: string })?.message ?? reason ?? "",
    );
    if (looksLikeChunkError(msg)) maybeReload();
  });

  window.addEventListener("error", (e: ErrorEvent) => {
    if (looksLikeChunkError(e.message ?? "")) maybeReload();
  });
}

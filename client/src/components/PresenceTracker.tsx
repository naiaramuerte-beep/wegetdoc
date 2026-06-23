/* =============================================================
   PresenceTracker — sends a heartbeat to /api/presence/ping
   every ~25 s so the server-side in-memory tracker can count
   the visitor as "active" for the admin's live-visitors widget.

   Renders nothing visible. Mounted once at the App root.

   - sessionId: random UUID kept in sessionStorage (clears on tab
     close, which is the right semantic — one tab = one visitor).
   - Skips the heartbeat when the tab is hidden (visibilitychange)
     so background tabs don't inflate the counter.
   - Fires immediately on mount + on route change so the path
     breakdown stays fresh.
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";

const HEARTBEAT_MS = 25_000;
const STORAGE_KEY = "editorpdf_presence_sid";

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = (crypto as any)?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Sandboxed iframes or strict privacy modes can throw on storage —
    // fall back to a per-page-load id, the counter is still useful.
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function ping(sessionId: string, path: string): void {
  // sendBeacon is fire-and-forget and survives page unload — perfect
  // for a counter that doesn't care about the response.
  const body = JSON.stringify({ sessionId, path });
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/presence/ping", blob);
    return;
  }
  fetch("/api/presence/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export default function PresenceTracker() {
  const [location] = useLocation();

  useEffect(() => {
    const sessionId = getSessionId();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (document.hidden) return; // skip while tab is in background
      ping(sessionId, location || "/");
    };

    // Fire immediately so a fresh visitor shows up within seconds.
    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);

    // Also tick on visibility return (user comes back to the tab).
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [location]);

  return null;
}

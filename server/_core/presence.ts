/* =============================================================
   Lightweight in-memory presence tracker for the admin "live
   visitors" counter. The client pings `/api/presence/ping`
   every ~25 s with a sessionId. We keep the latest timestamp
   per sessionId in a Map and consider a visitor "active" if
   their last ping was within `WINDOW_MS` (60 s by default).

   No DB — this is intentionally ephemeral and resets on
   server restart. That's the right trade-off for a UI gauge:
   precision is irrelevant, freshness matters.
   ============================================================= */

const WINDOW_MS = 60_000; // visitor counted as active for 60 s after last ping
const PRUNE_INTERVAL_MS = 30_000; // sweep stale entries every 30 s
const MAX_SESSIONS = 50_000; // hard cap so a malicious flood can't blow up RAM

type PresenceEntry = {
  lastSeen: number;
  path?: string;
};

const presence = new Map<string, PresenceEntry>();

export function recordPing(sessionId: string, path?: string): void {
  if (!sessionId || typeof sessionId !== "string") return;
  if (sessionId.length > 128) return;
  if (presence.size >= MAX_SESSIONS && !presence.has(sessionId)) return;
  presence.set(sessionId, {
    lastSeen: Date.now(),
    path: path && path.length <= 256 ? path : undefined,
  });
}

export function activeVisitors(): number {
  const cutoff = Date.now() - WINDOW_MS;
  let count = 0;
  presence.forEach((entry) => {
    if (entry.lastSeen >= cutoff) count++;
  });
  return count;
}

export function activeBreakdown(): { count: number; paths: { path: string; count: number }[] } {
  const cutoff = Date.now() - WINDOW_MS;
  const byPath = new Map<string, number>();
  let total = 0;
  presence.forEach((entry) => {
    if (entry.lastSeen < cutoff) return;
    total++;
    const key = entry.path ?? "(unknown)";
    byPath.set(key, (byPath.get(key) ?? 0) + 1);
  });
  const paths: { path: string; count: number }[] = [];
  byPath.forEach((count, path) => paths.push({ path, count }));
  paths.sort((a, b) => b.count - a.count);
  return { count: total, paths: paths.slice(0, 20) };
}

function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  const stale: string[] = [];
  presence.forEach((entry, id) => {
    if (entry.lastSeen < cutoff) stale.push(id);
  });
  for (const id of stale) presence.delete(id);
}

// Background sweeper — keeps the Map from growing unbounded.
// `unref()` so this timer never holds the process open on shutdown.
const timer = setInterval(prune, PRUNE_INTERVAL_MS);
if (typeof (timer as any).unref === "function") (timer as any).unref();

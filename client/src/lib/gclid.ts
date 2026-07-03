// Google Ads click-ID capture for SERVER-SIDE conversion reporting.
//
// Why: browser-side conversion pings (gtag) are eaten by Safari/ITP and
// adblockers — exactly the users who pay with Apple/Google Pay. So we capture
// the click ID here on landing, persist it, and later report the conversion
// from OUR backend (offline conversion import), which nothing can block.
//
// We store the FIRST click ID we see and keep it for 90 days (Google's
// click-through conversion window). gclid = standard; gbraid/wbraid = the
// privacy-preserving iOS/app click IDs Google uses when gclid isn't available.

const KEY = "editorpdf_gclid_v1";
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type StoredClickId = { id: string; type: "gclid" | "gbraid" | "wbraid"; ts: number };

// Read the click ID from the current URL and persist it (once). Safe to call on
// every load — it only writes when a click ID is present and none is stored yet.
export function captureGclid(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const gclid = p.get("gclid");
    const gbraid = p.get("gbraid");
    const wbraid = p.get("wbraid");
    const id = gclid || gbraid || wbraid;
    if (!id) return;
    const type: StoredClickId["type"] = gclid ? "gclid" : gbraid ? "gbraid" : "wbraid";

    // Don't overwrite a still-valid stored ID (keeps first-touch attribution),
    // but refresh if the stored one has expired.
    const existing = getStoredGclid();
    if (existing) return;
    localStorage.setItem(KEY, JSON.stringify({ id, type, ts: Date.now() } satisfies StoredClickId));
  } catch {
    // localStorage blocked (private mode / cookies off) — nothing to do.
  }
}

// Return the stored click ID if present and within the 90-day window.
export function getStoredGclid(): { id: string; type: StoredClickId["type"] } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as StoredClickId;
    if (!o?.id || typeof o.ts !== "number" || Date.now() - o.ts > TTL_MS) return null;
    return { id: o.id, type: o.type ?? "gclid" };
  } catch {
    return null;
  }
}

// Remembers where the user was when they launched a card payment, so that if the
// 3DS challenge fails at the bank (url_ko) or the confirm is rejected, the retry
// page can send them back to the SAME document with the checkout reopened —
// instead of dumping them on the home page having lost their work.
//
// We stash the full current href (which for the converter/landings already
// carries the document temp key in the query, e.g. ?rk=temp/…&rn=…), so
// returning to it restores the document with no re-upload.

const KEY = "editorpdf_pending_checkout";
const MAX_AGE_MS = 60 * 60 * 1000; // 1h — a stale marker must not resurrect an old doc

export type PendingCheckout = { href: string; ts: number };

export function stashPendingCheckout(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ href: window.location.href, ts: Date.now() }));
  } catch {
    /* private mode / storage disabled — retry page just falls back to home */
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as PendingCheckout;
    if (!v?.href || typeof v.ts !== "number" || Date.now() - v.ts > MAX_AGE_MS) return null;
    return v;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

/** Append reopenPay=1 to a stored href so the destination auto-reopens the paywall. */
export function withReopenFlag(href: string): string {
  try {
    const u = new URL(href);
    u.searchParams.set("reopenPay", "1");
    return u.toString();
  } catch {
    return href + (href.includes("?") ? "&" : "?") + "reopenPay=1";
  }
}

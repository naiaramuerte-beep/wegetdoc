// Version-based auto-reload. Solves the recurring "I deployed a fix but users
// still run the old bundle" problem: a browser that cached the old index.html
// keeps loading old JS until its cache revalidates, so a just-shipped fix can
// take hours to reach people who already had the tab/site cached.
//
// How it works: the client bundle bakes in the commit SHA it was built from
// (__BUILD_ID__, injected by vite.config `define`). The server exposes the SHA
// it is currently running at GET /api/version. If they differ, this tab is
// running a stale bundle → reload once to pick up the fresh index.html (which
// is served no-cache, so the reload revalidates to the new asset hashes).
//
// Safety: never reloads mid-payment / mid-OAuth, never loops (one reload per
// distinct server version per tab session), and no-ops in dev / when either
// side reports "dev".

declare const __BUILD_ID__: string;

const CLIENT_BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const GUARD_KEY = "vef_version_reloaded_for";
const MIN_CHECK_GAP_MS = 60_000;

let lastCheck = 0;

/** True when reloading now would interrupt something the user must not lose. */
function inSensitiveFlow(): boolean {
  const url = (location.pathname + location.search).toLowerCase();
  // Payment success/return, Sipay callbacks, the OAuth resume download flow,
  // and any raw OAuth params (code/state) — never yank the page out from under
  // these. They're short-lived; the next navigation will pick up the new build.
  // NEVER reload on the interactive flow pages — the editor + dashboard are
  // where the OAuth resume, the paywall and downloads happen, and a reload
  // there loses in-memory state (e.g. the edited-PDF tempKey) and strands the
  // user. A stale bundle on those pages is harmless; it self-updates on the
  // next navigation. Only landing/pricing/etc. pages ever auto-reload.
  if (url.includes("/editor") || url.includes("/dashboard") || url.includes("/payment")) return true;
  if (
    url.includes("sipay") ||
    url.includes("resume=") ||
    url.includes("code=") ||
    url.includes("state=") ||
    url.includes("txn=")
  ) return true;
  try {
    // A download/resume is mid-flight (survives the resume-param stripping).
    if (sessionStorage.getItem("cloudpdf_pending_action")) return true;
    if (sessionStorage.getItem("cloudpdf_open_paywall") === "1") return true;
  } catch { /* storage disabled — fall through */ }
  return false;
}

async function checkOnce(): Promise<void> {
  // Nothing to compare against outside a real Railway build.
  if (CLIENT_BUILD_ID === "dev") return;
  if (document.visibilityState === "hidden") return;
  if (inSensitiveFlow()) return;

  const now = Date.now();
  if (now - lastCheck < MIN_CHECK_GAP_MS) return;
  lastCheck = now;

  let serverId: string | null = null;
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    serverId = typeof data?.id === "string" ? data.id : null;
  } catch {
    return; // offline / transient — try again next visibility change
  }

  if (!serverId || serverId === "dev") return;
  if (serverId === CLIENT_BUILD_ID) return; // up to date

  // Stale bundle detected. Reload at most once per distinct server version so a
  // mismatch that somehow survives the reload can't spin the tab.
  let already: string | null = null;
  try {
    already = sessionStorage.getItem(GUARD_KEY);
  } catch {
    /* private mode / storage disabled — fall through, reload once */
  }
  if (already === serverId) return;
  try {
    sessionStorage.setItem(GUARD_KEY, serverId);
  } catch {
    /* ignore */
  }
  // Re-check the sensitive-flow guard right before pulling the trigger.
  if (inSensitiveFlow()) return;
  location.reload();
}

export function installVersionAutoReload(): void {
  if (typeof window === "undefined") return;
  // First check shortly after load (let the app paint first).
  window.setTimeout(() => { void checkOnce(); }, 5_000);
  // And whenever the tab is refocused — that's when a long-idle stale tab is
  // most likely to have missed a deploy.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkOnce();
  });
  window.addEventListener("focus", () => { void checkOnce(); });
}

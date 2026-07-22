/**
 * Internal cron scheduler — runs INSIDE the main web service (which is always
 * online), so the owner doesn't have to create separate Railway cron services.
 *
 * It fires the existing HTTP cron endpoints over localhost with the CRON_SECRET,
 * reusing their exact (already-tested) logic:
 *   - Daily sales summary → Telegram at ~23:00 Europe/Madrid (once per day).
 *   - Recovery emails to non-payers every 25 minutes.
 *
 * NOTE: assumes a SINGLE web replica (the current setup). With multiple replicas
 * each would run its own scheduler → duplicate fires. The daily summary is
 * guarded once-per-Madrid-day via site_settings (survives restarts); recovery is
 * idempotent (marks docs sent) but could still double-send under a multi-replica
 * race — revisit if the service is ever scaled horizontally.
 */
import { ENV } from "./env";
import { getSiteSetting, setSiteSetting } from "../db";

let started = false;

const part = (parts: Intl.DateTimeFormatPart[], type: string) =>
  parts.find((p) => p.type === type)?.value ?? "";

export function startInternalSchedulers(port: number): void {
  if (started) return;
  started = true;

  if (!ENV.cronSecret) {
    console.warn("[scheduler] CRON_SECRET missing — internal schedulers disabled");
    return;
  }
  const base = `http://127.0.0.1:${port}`;

  const hit = async (path: string) => {
    try {
      const r = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "X-Cron-Secret": ENV.cronSecret },
      });
      console.log(`[scheduler] ${path} → HTTP ${r.status}`);
    } catch (err: any) {
      console.error(`[scheduler] ${path} failed:`, err?.message ?? err);
    }
  };

  // ── Daily summary at ~23:00 Europe/Madrid ─────────────────────────────────
  // Check every 5 min; fire once when the Madrid hour is 23 and we haven't
  // already fired for that Madrid day. The guard lives in site_settings so a
  // restart during the 23:xx window can't double-send the summary.
  const SUMMARY_KEY = "last_daily_summary_day";
  const checkSummary = async () => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid", hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
      }).formatToParts(new Date());
      const day = `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
      const hour = Number(part(parts, "hour"));
      if (hour !== 23) return;
      const last = await getSiteSetting(SUMMARY_KEY);
      if (last === day) return;
      await setSiteSetting(SUMMARY_KEY, day); // guard BEFORE firing
      await hit("/api/cron/daily-summary");
    } catch (err) {
      console.error("[scheduler] daily-summary check failed:", err);
    }
  };
  setInterval(() => { void checkSummary(); }, 5 * 60 * 1000);
  void checkSummary(); // also check right after boot (covers a restart at 23:xx)

  // ── Recovery emails every 25 min ──────────────────────────────────────────
  setInterval(() => { void hit("/api/cron/recovery-emails"); }, 25 * 60 * 1000);

  console.log("[scheduler] internal schedulers started (daily summary @23:00 Madrid + recovery /25min)");
}

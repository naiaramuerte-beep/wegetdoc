// Hits POST /api/cron/recovery-emails with the X-Cron-Secret header.
// Designed to run as a Railway Scheduled Task (separate service from the web
// app), every ~20-30 min. Each run sends the recovery email ("tu archivo está
// listo, descárgalo") to up to MAX_PER_RUN abandoned no-payers (default 50) and
// deletes pending docs older than the 7-day retention. Exits 0 on HTTP 2xx.
const BASE = process.env.CRON_TARGET_URL || "https://editorpdf.net/api/cron/recovery-emails";
const SECRET = process.env.CRON_SECRET;
// Optional per-run cap override (defaults to the server's 50).
const MAX = process.env.RECOVERY_MAX_PER_RUN;
const URL = MAX ? `${BASE}?max=${encodeURIComponent(MAX)}` : BASE;

if (!SECRET) {
  console.error("CRON_SECRET env var is missing — refusing to call the endpoint without authentication.");
  process.exit(2);
}

console.log(`[${new Date().toISOString()}] Calling ${URL}`);
const startedAt = Date.now();

try {
  const res = await fetch(URL, { method: "POST", headers: { "X-Cron-Secret": SECRET } });
  const body = await res.text();
  console.log(`HTTP ${res.status} in ${Date.now() - startedAt}ms`);
  console.log(body.slice(0, 2000));
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error(`fetch failed: ${err?.message ?? err}`);
  process.exit(3);
}

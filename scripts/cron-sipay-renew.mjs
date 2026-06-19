// Hits POST /api/cron/sipay-renew with the X-Cron-Secret header.
// Designed to run as a Railway Scheduled Task (separate service from the
// web app) so that one daily invocation triggers all due MIT-R charges.
// Exits 0 on HTTP 2xx, non-zero otherwise — Railway will surface failures.
const URL = process.env.CRON_TARGET_URL || "https://editorpdf.net/api/cron/sipay-renew";
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("CRON_SECRET env var is missing — refusing to call the endpoint without authentication.");
  process.exit(2);
}

console.log(`[${new Date().toISOString()}] Calling ${URL}`);
const startedAt = Date.now();

try {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "X-Cron-Secret": SECRET },
  });
  const body = await res.text();
  const tookMs = Date.now() - startedAt;
  console.log(`HTTP ${res.status} in ${tookMs}ms`);
  console.log(body);
  if (!res.ok) {
    process.exit(1);
  }
  process.exit(0);
} catch (err) {
  console.error(`fetch failed: ${err?.message ?? err}`);
  process.exit(3);
}

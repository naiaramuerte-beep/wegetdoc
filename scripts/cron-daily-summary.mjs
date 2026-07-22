// Hits POST /api/cron/daily-summary with the X-Cron-Secret header.
// Railway Scheduled Task a las 23:00 Madrid: cron "0 21 * * *" (21:00 UTC en
// verano; en invierno Madrid es UTC+1 → ajustar a "0 22 * * *" si se quiere
// exactamente las 23:00). Envía el resumen del día al Telegram del dueño.
const URL = process.env.CRON_TARGET_URL || "https://editorpdf.net/api/cron/daily-summary";
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("CRON_SECRET env var is missing — refusing to call the endpoint without authentication.");
  process.exit(2);
}

console.log(`[${new Date().toISOString()}] Calling ${URL}`);
try {
  const res = await fetch(URL, { method: "POST", headers: { "X-Cron-Secret": SECRET } });
  const body = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(body.slice(0, 1000));
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error(`fetch failed: ${err?.message ?? err}`);
  process.exit(3);
}

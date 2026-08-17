// SOLO LECTURA (?dry=1): a quién le tocaría renovar ahora mismo y por cuánto,
// diciendo si el importe sale del precio anclado de esa persona o del ajuste
// global. Es la comprobación de que una subida de precio NO toca a los que ya
// están dentro.
//   railway run node scripts/_chk-cron-dry.mjs
const secret = process.env.CRON_SECRET;
if (!secret) { console.error("Falta CRON_SECRET (usa railway run)"); process.exit(1); }
const base = process.argv[2] ?? "https://www.editorpdf.net";
const r = await fetch(`${base}/api/cron/sipay-renew?dry=1`, {
  method: "POST", headers: { "X-Cron-Secret": secret },
});
const j = await r.json().catch(() => ({}));
const rs = j.results ?? [];
console.log(`HTTP ${r.status} · vencidas ahora mismo: ${rs.length}`);
for (const x of rs) console.log(`  sub#${x.subId} user=${x.userId} → ${x.action ?? x.reason ?? "?"}`);
if (!rs.length) console.log("  (ninguna vencida en este instante: el cron cobra a cada una a su hora)");
process.exit(0);

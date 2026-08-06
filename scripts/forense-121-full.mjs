// READ-ONLY — conteo REAL de 121 leyendo payload.code de los eventos (no
// errorDetail, que antes del 18-jul se guardaba sin el prefijo del código),
// + ¿estaba viva la tarjeta? Horas UTC + Madrid (norma 2026-08-06).
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();

const [ev] = await db.query(
  `SELECT eventId, errorMessage, payload, ${tzCols("receivedAt", "ts")}
     FROM webhook_events WHERE eventType LIKE 'mit%' ORDER BY receivedAt`);

const parsed = [];
for (const e of ev) {
  let p = e.payload;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { continue; } }
  const code = String(p?.payload?.code ?? "");
  const uid = String(e.eventId ?? "").match(/^mit-(?:upgrade-)?(\d+)-/)?.[1];
  parsed.push({ code, uid: uid ? Number(uid) : null, ts_utc: e.ts_utc, ts_mad: e.ts_mad, card: p?.payload?.masked_card, exp: p?.payload?.expiration });
}

const dist = {};
for (const r of parsed) dist[r.code || "(sin code)"] = (dist[r.code || "(sin code)"] ?? 0) + 1;
console.log("=== distribución REAL de códigos (payload.code) en eventos MIT ===");
for (const [c, n] of Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 12))
  console.log(`  ${c.padEnd(12)} n=${n}`);

const r121 = parsed.filter(r => r.code === "121");
const users = [...new Set(r121.map(r => r.uid).filter(Boolean))];
console.log(`\n=== 121: ${r121.length} denegaciones sobre ${users.length} usuarios distintos ===`);
for (const r of r121)
  console.log(`  ${r.ts_utc} UTC / ${r.ts_mad} Madrid  u=${r.uid ?? "?"}  ${r.card ?? "—"}  caduca ${r.exp ?? "—"}`);

console.log("\n=== ¿estaba viva la tarjeta de cada uno? ===");
const [hist] = await db.query(
  `SELECT userId, provider, status, amountCents, errorDetail, ${tzCols("createdAt", "ts")}
     FROM charges WHERE userId IN (?) ORDER BY userId, createdAt`, [users]);
const byUser = {};
for (const h of hist) (byUser[h.userId] ||= []).push(h);
let vivas = 0;
for (const uid of users) {
  const rows = byUser[uid] ?? [];
  const oks = rows.filter(r => r.status === "ok");
  const viva = oks.length > 0;
  if (viva) vivas++;
  const first121 = r121.filter(r => r.uid === uid).map(r => r.ts_utc).sort()[0];
  const prev = oks.filter(r => r.ts_utc < first121).pop();
  const gap = prev ? ((new Date(first121 + "Z") - new Date(prev.ts_utc + "Z")) / 864e5).toFixed(1) : null;
  console.log(`  u=${String(uid).padEnd(6)} cobros OK=${oks.length}  ${viva ? "TARJETA VIVA" : "sin OK"}${gap ? `  · último OK ${gap} días antes del 1º 121` : ""}`);
}
console.log(`\n  ${vivas}/${users.length} tenían al menos un cobro OK (tarjeta viva)`);

const [subs] = await db.query(
  `SELECT id, userId, status, plan, lastDeclineCode, declineCategory FROM subscriptions WHERE userId IN (?) ORDER BY userId`, [users]);
console.log("\n=== estado actual de esas subs ===");
const cnt = {};
for (const s of subs) { cnt[s.status] = (cnt[s.status] ?? 0) + 1; console.log(`  sub#${s.id} u=${s.userId} ${s.status}/${s.plan} code=${s.lastDeclineCode ?? "—"} cat=${s.declineCategory ?? "—"}`); }
console.log("  resumen:", JSON.stringify(cnt));
await db.end();

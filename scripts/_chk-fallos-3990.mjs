// SOLO LECTURA. Los intentos de cobro a 39,90 €: qué eran (renovación del cron o
// upgrade de 1 clic), qué código devolvió el banco y con qué método. Es el primer
// dato del precio nuevo, y si el importe mayor empeora la aprobación se ve aquí.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);
const [ch] = await db.query(
  `SELECT id, userId, amountCents, status, provider, sipayOrder, errorDetail, ${tzCols("createdAt", "c")}
     FROM charges WHERE amountCents = 3990 ORDER BY createdAt`);
for (const c of ch) {
  const tipo = String(c.sipayOrder ?? "").startsWith("mit-upgrade") ? "UPGRADE de 1 clic (lo pide el usuario)" : "renovación del cron";
  console.log(`#${c.id} user=${c.userId} ${c.status.toUpperCase()} ${tzShow(c, "c")}`);
  console.log(`   ${tipo}   order=${c.sipayOrder ?? "-"}   ${c.errorDetail ? "motivo: " + String(c.errorDetail).slice(0, 120) : ""}`);
  const [ev] = await db.query(
    `SELECT eventType, payload FROM webhook_events
      WHERE payload LIKE ? ORDER BY id DESC LIMIT 1`, [`%${c.sipayOrder}%`]);
  if (ev.length) {
    let cod = "?";
    try { const o = typeof ev[0].payload === "string" ? JSON.parse(ev[0].payload) : ev[0].payload;
          cod = String(o?.payload?.code ?? "?"); } catch {}
    console.log(`   evento ${ev[0].eventType}   código ${cod}`);
  }
}
// Comparación honesta: aprobación por importe en los últimos 3 días.
const [comp] = await db.query(
  `SELECT amountCents, SUM(status='ok') ok, COUNT(*) n FROM charges
    WHERE amountCents >= 1000 AND createdAt >= UTC_TIMESTAMP() - INTERVAL 3 DAY
    GROUP BY amountCents ORDER BY amountCents`);
console.log("\n████ APROBACIÓN POR IMPORTE (3 días) ████");
for (const r of comp) console.log(`  ${(r.amountCents / 100).toFixed(2)} €  ${r.ok}/${r.n}  ${r.n ? Math.round(100 * r.ok / r.n) + " %" : "—"}`);
await db.end();
process.exit(0);

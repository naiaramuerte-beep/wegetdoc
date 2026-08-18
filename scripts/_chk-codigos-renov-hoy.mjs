// SOLO LECTURA. Códigos de rechazo de las renovaciones de hoy comparados con los
// de ayer, y el importe que se mandó en cada una. Si apareciera un código nuevo
// —o un importe raro— sería culpa nuestra; si es el mismo 190 de siempre, es el
// adquirente.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);
const [ev] = await db.query(
  `SELECT DATE(CONVERT_TZ(receivedAt,'+00:00','Europe/Madrid')) d, payload
     FROM webhook_events
    WHERE eventType = 'mit_charge_failed' AND receivedAt >= UTC_TIMESTAMP() - INTERVAL 3 DAY`);
const tabla = new Map();
for (const e of ev) {
  const d = new Date(e.d).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  let cod = "?", imp = "?";
  try {
    const o = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
    cod = String(o?.payload?.code ?? "?");
    imp = String(o?.payload?.amount ?? "?");
  } catch {}
  const k = `${d}|${cod}|${imp}`;
  tabla.set(k, (tabla.get(k) ?? 0) + 1);
}
console.log("día          código   importe   veces");
for (const [k, n] of [...tabla].sort()) {
  const [d, c, i] = k.split("|");
  console.log(`  ${d}  ${c.padStart(5)}   ${String(i).padStart(6)}   ${String(n).padStart(4)}`);
}
await db.end();
process.exit(0);

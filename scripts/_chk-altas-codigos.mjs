// SOLO LECTURA. Todos los intentos de ALTA (0,50 €) con su código de respuesta,
// hora a hora y comparando con ayer. Responde a "no entran pagos": ¿es que nadie
// lo intenta, o es que al banco le da por rechazar?
//   railway run node scripts/_chk-altas-codigos.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 2);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [ev] = await db.query(
  `SELECT id, eventType, ${tzCols("receivedAt", "r")}, payload
     FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND eventType NOT LIKE 'mit%'
      AND (eventType LIKE '%intro_charge' OR eventType LIKE '%charge_failed'
        OR eventType LIKE '%confirm_failed' OR eventType LIKE '%callback_ko')
    ORDER BY receivedAt`, [DIAS]);

const codigoDe = (p) => {
  try {
    const o = typeof p === "string" ? JSON.parse(p) : p;
    return String(o?.payload?.code ?? o?.response?.payload?.code ?? o?.query?.error ?? o?.detail ?? o?.response?.detail ?? "?").slice(0, 22);
  } catch { return "?"; }
};
const metodoDe = (t) => t.startsWith("gpay") ? "gpay" : t.startsWith("apay") ? "apay" : "tarjeta";

console.log("████ INTENTOS DE ALTA, UNO A UNO ████");
console.log("hora (Madrid)        método    resultado   código/detalle");
for (const e of ev) {
  const ok = /intro_charge$/.test(e.eventType);
  console.log(`  ${e.r_mad}  ${metodoDe(e.eventType).padEnd(8)}  ${(ok ? "COBRADA" : "fallo").padEnd(9)}  ${ok ? "" : codigoDe(e.payload)}`);
}

// Resumen por día y método
const porDia = new Map();
for (const e of ev) {
  const d = e.r_mad.slice(0, 10);
  const m = metodoDe(e.eventType);
  const k = `${d}|${m}`;
  if (!porDia.has(k)) porDia.set(k, { ok: 0, fallo: 0 });
  /intro_charge$/.test(e.eventType) ? porDia.get(k).ok++ : porDia.get(k).fallo++;
}
console.log("\n████ RESUMEN POR DÍA Y MÉTODO ████");
console.log("día          método    cobradas   fallidas   % aprobación");
for (const [k, v] of [...porDia].sort()) {
  const [d, m] = k.split("|");
  const tot = v.ok + v.fallo;
  console.log(`  ${d}  ${m.padEnd(8)}  ${String(v.ok).padStart(8)}${String(v.fallo).padStart(11)}       ${tot ? Math.round(100 * v.ok / tot) + " %" : "—"}`);
}
await db.end();
process.exit(0);

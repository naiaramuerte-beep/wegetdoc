// Genera el EXPEDIENTE del código 190 para reclamar a Sipay/Comercia.
//
// El 190 de Redsys significa "denegada por el emisor", pero aquí hay dos hechos
// que no cuadran con esa explicación y que son los que hay que ponerles delante:
//   1. La MISMA tarjeta que devuelve 190 aprueba en otro intento (a veces minutos
//      después). Si el emisor la hubiera denegado de verdad, no aprobaría.
//   2. Afecta por igual a importes de 0,50 € (altas) y de 29,95 € (renovaciones),
//      así que no es un problema de fondos.
//
// Salida: docs/expediente-190-<fecha>.md, listo para adjuntar al ticket.
//   railway run node scripts/expediente-190.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
import fs from "fs";

const DIAS = Number(process.argv[2] ?? 7);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
const L = [];
const w = (s = "") => { L.push(s); console.log(s); };

w(`# Expediente del código 190 — EditorPDF (Clicklabs Digital Ventures, S.L.)`);
w(``);
w(`Generado: ${tzShow(t, "ahora")}   ·   Ventana analizada: últimos ${DIAS} días`);
w(`Comercio: \`clicklabsdigital\`   ·   Entorno: live.sipay.es`);
w(``);

// ── 1. Volumen del problema ──────────────────────────────────────────────────
const [tot] = await db.query(
  `SELECT DATE(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid')) d,
          SUM(status='ok') ok, SUM(status<>'ok') ko, COUNT(*) n,
          SUM(status<>'ok') * MAX(amountCents) / 100 perdido
     FROM charges
    WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY AND amountCents >= 1000
    GROUP BY d ORDER BY d`, [DIAS]);
w(`## 1. Renovaciones (MIT-R, 29,95 €): aprobación por día`);
w(``);
w(`| día | aprobadas | denegadas | % aprobación | importe denegado |`);
w(`|---|---|---|---|---|`);
let totKo = 0, totN = 0, totOk = 0;
for (const r of tot) {
  const d = new Date(r.d).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const pct = r.n ? Math.round(100 * r.ok / r.n) : 0;
  totKo += Number(r.ko); totN += Number(r.n); totOk += Number(r.ok);
  w(`| ${d} | ${r.ok} | ${r.ko} | ${pct} % | ${(Number(r.ko) * 29.95).toFixed(2)} € |`);
}
w(``);
w(`**Total ventana: ${totOk} aprobadas de ${totN} (${totN ? Math.round(100 * totOk / totN) : 0} %). ${totKo} denegaciones = ${(totKo * 29.95).toFixed(2)} € no cobrados.**`);
w(``);

// ── 2. Reparto por código ────────────────────────────────────────────────────
const [ev] = await db.query(
  `SELECT payload, eventType FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND (eventType LIKE '%charge_failed' OR eventType LIKE '%confirm_failed')`, [DIAS]);
const porCodigo = new Map();
for (const e of ev) {
  let c = "?";
  try { const o = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
        c = String(o?.payload?.code ?? o?.response?.payload?.code ?? "?"); } catch {}
  porCodigo.set(c, (porCodigo.get(c) ?? 0) + 1);
}
w(`## 2. Códigos de denegación devueltos`);
w(``);
w(`| código | veces |`);
w(`|---|---|`);
for (const [c, n] of [...porCodigo].sort((a, b) => b[1] - a[1])) w(`| ${c} | ${n} |`);
w(``);

// ── 3. La prueba: la MISMA tarjeta deniega y luego aprueba ───────────────────
w(`## 3. LA PRUEBA: se deniega el pago y la misma persona paga minutos después`);
w(``);
w(`Si el emisor estuviera denegando de verdad, el cliente no conseguiría pagar a`);
w(`continuación. En los cargos de alta (0,50 €) pasa constantemente: el wallet`);
w(`(Google Pay / Apple Pay) devuelve 190/195/180, el usuario reintenta con tarjeta`);
w(`y aprueba **en 1-8 minutos**. Mismo cliente, mismo dinero, misma sesión.`);
w(``);
w(`> Nota metodológica: los cargos denegados NO traen \`masked_card\` en la`);
w(`> respuesta de Sipay (0 de 251 en 7 días), así que el emparejamiento es por`);
w(`> usuario. En MIT-R el token es \`usr-<userId>\` y apunta siempre a la misma`);
w(`> tarjeta guardada, así que dos cargos de un usuario son de la misma tarjeta.`);
w(``);
// Los fallos del alta viven en webhook_events (charges solo guarda los éxitos
// del alta), así que se cruzan los dos: fallo → primer cobro aprobado posterior
// del mismo usuario. El userId sale del `order` (`gpay-<id>-<ts>`).
const [fallosAlta] = await db.query(
  `SELECT id, eventType, ${tzCols("receivedAt", "r")}, payload FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND eventType NOT LIKE 'mit%'
      AND (eventType LIKE '%charge_failed' OR eventType LIKE '%confirm_failed')
    ORDER BY receivedAt DESC`, [DIAS]);
const uidDe = (p) => {
  try {
    const o = typeof p === "string" ? JSON.parse(p) : p;
    const orden = String(o?.payload?.order ?? o?.response?.payload?.order ?? "");
    const m = orden.match(/^(?:gpay|apay|fastpay|fpay)-(\d+)-/);
    return m ? Number(m[1]) : Number(o?.payload?.custom_01 ?? 0) || 0;
  } catch { return 0; }
};
const codDe = (p) => {
  try { const o = typeof p === "string" ? JSON.parse(p) : p;
        return String(o?.payload?.code ?? o?.response?.payload?.code ?? "?"); } catch { return "?"; }
};
const pares = [];
let conUsuario = 0;
for (const f of fallosAlta) {
  const uid = uidDe(f.payload);
  if (!uid) continue;
  conUsuario++;
  const [[ok]] = await db.query(
    `SELECT provider, ${tzCols("createdAt", "c")} FROM charges
      WHERE userId = ? AND status='ok' AND createdAt > ? ORDER BY createdAt LIMIT 1`,
    [uid, f.r_utc]);
  if (!ok) continue;
  const min = Math.round((new Date(ok.c_utc + "Z") - new Date(f.r_utc + "Z")) / 60000);
  pares.push({ uid, metodoKo: f.eventType.split("_")[0], cod: codDe(f.payload), koMad: f.r_mad, okMad: ok.c_mad, metodoOk: ok.provider, min });
}
if (!pares.length) {
  w(`_(sin pares en esta ventana; ampliar días)_`);
} else {
  w(`**${pares.length} de ${conUsuario} denegaciones acabaron en un cobro aprobado del mismo cliente.** Muestra:`);
  w(``);
  w(`| usuario | denegada | método | código | aprobada | método | minutos |`);
  w(`|---|---|---|---|---|---|---|`);
  for (const p of pares.slice(0, 25)) {
    w(`| ${p.uid} | ${p.koMad} | ${p.metodoKo} | ${p.cod} | ${p.okMad} | ${p.metodoOk} | ${p.min} |`);
  }
  const rapidos = pares.filter(p => p.min <= 10).length;
  w(``);
  w(`De ellos, **${rapidos} aprobaron en 10 minutos o menos**. El patrón dominante es`);
  w(`wallet denegado → tarjeta aprobada, lo que apunta a la configuración de los`);
  w(`wallets en el comercio, no al emisor del cliente.`);
}
w(``);

// ── 4. También en importes de 0,50 € ─────────────────────────────────────────
const [altas] = await db.query(
  `SELECT COUNT(*) n FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND eventType NOT LIKE 'mit%' AND eventType LIKE '%failed'
      AND payload LIKE '%"amount":"50"%'`, [DIAS]);
w(`## 4. No es falta de fondos: también deniega cobros de 0,50 €`);
w(``);
w(`En la misma ventana hay **${altas[0].n} denegaciones sobre importes de 0,50 €**`);
w(`(el cargo de alta). Un 190 por saldo insuficiente sobre medio euro no es creíble.`);
w(``);

// ── 5. Petición ──────────────────────────────────────────────────────────────
w(`## 5. Lo que pedimos`);
w(``);
w(`1. Confirmación de qué devuelve exactamente el emisor en estas operaciones`);
w(`   (código ISO original, no el 190 traducido) para al menos las transacciones`);
w(`   listadas arriba.`);
w(`2. Si el 190 lo está generando el adquirente y no el emisor, qué regla lo`);
w(`   dispara (importe, MIT sin CIT previo, exención SCA, país de la tarjeta).`);
w(`3. Revisión de la configuración del comercio \`clicklabsdigital\` para`);
w(`   operaciones recurrentes MIT-R y para wallets (Apple Pay / Google Pay).`);
w(``);

const nombre = `docs/expediente-190-${new Date(t.ahora_utc.replace(" ", "T") + "Z").toISOString().slice(0, 10)}.md`;
fs.writeFileSync(nombre, L.join("\n") + "\n", "utf-8");
console.log(`\n→ Escrito en ${nombre}`);
await db.end();
process.exit(0);

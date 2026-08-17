// SOLO LECTURA. ¿Hay gente a la que le deniegan el alta y consigue pagar poco
// después? Ése es el argumento fuerte contra el "lo deniega tu banco": la misma
// persona, la misma tarjeta o el mismo bolsillo, minutos después, aprobada.
// Los fallos de alta viven en `webhook_events` (charges solo guarda los éxitos
// del alta), así que hay que cruzar los dos.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 10);
const db = await openDb();

const [[c]] = await db.query(
  `SELECT SUM(amountCents<=100 AND status<>'ok') altasKo, SUM(amountCents<=100 AND status='ok') altasOk
     FROM charges WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY`, [DIAS]);
console.log(`En charges (${DIAS} días): altas OK=${c.altasOk}  altas denegadas=${c.altasKo}\n`);

// Fallos de alta desde webhook_events, con su userId sacado del payload/order.
const [fallos] = await db.query(
  `SELECT id, eventType, ${tzCols("receivedAt", "r")}, payload FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND eventType NOT LIKE 'mit%'
      AND (eventType LIKE '%charge_failed' OR eventType LIKE '%confirm_failed' OR eventType LIKE '%callback_ko')
    ORDER BY receivedAt`, [DIAS]);

const userIdDe = (p) => {
  try {
    const o = typeof p === "string" ? JSON.parse(p) : p;
    const orden = String(o?.payload?.order ?? o?.response?.payload?.order ?? "");
    const m = orden.match(/^(?:gpay|apay|fastpay|fpay)-(\d+)-/);
    if (m) return Number(m[1]);
    return Number(o?.payload?.custom_01 ?? o?.userId ?? 0) || 0;
  } catch { return 0; }
};
const codigoDe = (p) => {
  try { const o = typeof p === "string" ? JSON.parse(p) : p;
        return String(o?.payload?.code ?? o?.response?.payload?.code ?? o?.query?.error ?? "?"); } catch { return "?"; }
};

let conUser = 0, recuperados = 0;
const lineas = [];
for (const f of fallos) {
  const uid = userIdDe(f.payload);
  if (!uid) continue;
  conUser++;
  const [[ok]] = await db.query(
    `SELECT id, amountCents, provider, ${tzCols("createdAt", "c")} FROM charges
      WHERE userId = ? AND status='ok' AND amountCents <= 100 AND createdAt > ?
      ORDER BY createdAt LIMIT 1`, [uid, f.r_utc]);
  if (ok) {
    recuperados++;
    const min = Math.round((new Date(ok.c_utc + "Z") - new Date(f.r_utc + "Z")) / 60000);
    lineas.push(`  user=${uid}  DENEGADA ${f.r_mad} (${f.eventType}, código ${codigoDe(f.payload)})  →  APROBADA ${ok.c_mad} por ${ok.provider}  tras ${min} min`);
  }
}
console.log(`Fallos de alta con usuario identificable: ${conUser} de ${fallos.length}`);
console.log(`De ésos, la persona LOGRÓ pagar después: ${recuperados}\n`);
for (const l of lineas.slice(0, 25)) console.log(l);
if (!lineas.length) console.log("  (ninguno: a quien le deniegan el alta, se va)");
await db.end();
process.exit(0);

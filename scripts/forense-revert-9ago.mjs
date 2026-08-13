// READ-ONLY — ¿por qué se revirtió el candado del alta el 9-ago?
// Ventana de vida del candado en producción: merge 09:16 UTC (11:16 Madrid),
// revert 10:01 UTC (12:01 Madrid). Se mira algo más ancho para ver el antes/después.
//   node scripts/forense-revert-9ago.mjs
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();

// El deploy de Railway tarda unos minutos; la ventana real del candado vivo es
// aproximadamente 09:20–10:10 UTC. Se abre a 08:00–12:00 para tener contexto.
const DESDE = "2026-08-09 08:00:00";
const HASTA = "2026-08-09 12:00:00";
const MERGE = "2026-08-09 09:16:50";
const REVERT = "2026-08-09 10:01:24";

console.log(`Ventana: ${DESDE} → ${HASTA} UTC`);
console.log(`  merge  ${MERGE} UTC (11:16 Madrid)`);
console.log(`  revert ${REVERT} UTC (12:01 Madrid)\n`);

console.log("████ 1) EVENTOS del embudo en la ventana (por tipo y tramo) ████");
const [ev] = await db.query(
  `SELECT eventType,
          SUM(receivedAt <  ?) antes,
          SUM(receivedAt >= ? AND receivedAt < ?) durante,
          SUM(receivedAt >= ?) despues,
          COUNT(*) total
     FROM webhook_events
    WHERE receivedAt BETWEEN ? AND ?
    GROUP BY eventType ORDER BY total DESC`,
  [MERGE, MERGE, REVERT, REVERT, DESDE, HASTA]);
console.log("  " + "eventType".padEnd(30) + "antes durante después");
for (const r of ev) {
  console.log(`  ${r.eventType.padEnd(30)}${String(r.antes).padStart(5)}${String(r.durante).padStart(8)}${String(r.despues).padStart(9)}`);
}
if (!ev.length) console.log("  (ninguno)");

console.log("\n████ 2) EVENTOS DEL CANDADO (alta_duplicate_blocked / alta_price_mismatch) ████");
const [cand] = await db.query(
  `SELECT ${tzCols("receivedAt", "ts")}, eventType, status,
          LEFT(COALESCE(errorMessage,''),100) err, LEFT(CAST(payload AS CHAR),300) payload
     FROM webhook_events
    WHERE eventType IN ('alta_duplicate_blocked','alta_price_mismatch')
    ORDER BY receivedAt DESC LIMIT 40`);
console.log(`  encontrados (histórico completo): ${cand.length}`);
for (const r of cand) console.log(`  ${tzShow(r, "ts")}  ${r.eventType}  ${r.status}  ${r.err}\n      ${r.payload}`);
if (!cand.length) console.log("  ninguno — el candado nunca llegó a bloquear nada");

console.log("\n████ 3) ALTAS (charges no-MIT) en la ventana ████");
const [ch] = await db.query(
  `SELECT ${tzCols("createdAt", "ts")}, id, userId, provider, amountCents, status,
          LEFT(COALESCE(errorDetail,''),60) err
     FROM charges
    WHERE provider<>'mit' AND createdAt BETWEEN ? AND ?
    ORDER BY createdAt`, [DESDE, HASTA]);
console.log(`  cargos: ${ch.length}`);
for (const r of ch) {
  const tramo = r.ts_utc < MERGE ? "antes " : r.ts_utc < REVERT ? "DURANTE" : "después";
  console.log(`  ${tzShow(r, "ts")} [${tramo}] #${r.id} u=${r.userId} ${r.provider} ${(r.amountCents / 100).toFixed(2)}€ ${r.status} ${r.err}`);
}

console.log("\n████ 4) ERRORES en la ventana (status='error') ████");
const [errs] = await db.query(
  `SELECT ${tzCols("receivedAt", "ts")}, eventType, LEFT(COALESCE(errorMessage,''),120) err
     FROM webhook_events
    WHERE status='error' AND receivedAt BETWEEN ? AND ?
    ORDER BY receivedAt`, [DESDE, HASTA]);
console.log(`  errores: ${errs.length}`);
for (const r of errs) console.log(`  ${tzShow(r, "ts")}  ${r.eventType.padEnd(26)} ${r.err}`);

console.log("\n████ 5) ¿SIGUE HABIENDO DUPLICADOS DESPUÉS DEL REVERT? ████");
const [dups] = await db.query(
  `SELECT a.userId, a.id id1, b.id id2,
          ${tzCols("a.createdAt", "t1")}, ${tzCols("b.createdAt", "t2")},
          TIMESTAMPDIFF(MINUTE, a.createdAt, b.createdAt) mins,
          a.provider p1, b.provider p2
     FROM charges a JOIN charges b
       ON a.userId=b.userId AND b.id>a.id
      AND b.createdAt BETWEEN a.createdAt AND DATE_ADD(a.createdAt, INTERVAL 120 MINUTE)
    WHERE a.provider<>'mit' AND b.provider<>'mit'
      AND a.status='ok' AND b.status='ok'
      AND a.createdAt >= ?
    ORDER BY a.createdAt`, [REVERT]);
console.log(`  duplicados (≤120 min) desde el revert: ${dups.length}`);
for (const r of dups) {
  console.log(`  🚨 u=${r.userId}  #${r.id1} ${r.p1} ${tzShow(r, "t1")}  →  #${r.id2} ${r.p2} ${tzShow(r, "t2")}  (+${r.mins} min)`);
}
if (!dups.length) console.log("  ninguno todavía");

await db.end();

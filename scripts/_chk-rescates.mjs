// SOLO LECTURA. De los cobros recurrentes que SÍ entran, ¿cuántos son limpios y
// cuántos rescatados en un reintento? Es la misma cuenta que ahora sale
// etiquetada en cada aviso de Telegram, pero en histórico: si la mayor parte del
// ingreso son rescates, el problema no es el precio ni el tráfico, es que la
// pasarela deniega el primer cargo.
//   railway run node scripts/_chk-rescates.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 30);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (ventana: ${DIAS} días)\n`);

const [ok] = await db.query(
  `SELECT c.id, c.userId, c.amountCents, ${tzCols("c.createdAt", "c")}
     FROM charges c
    WHERE c.status='ok' AND c.amountCents >= 1000 AND c.provider='mit'
      AND c.createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
    ORDER BY c.createdAt`, [DIAS]);

let limpios = 0, rescatados = 0, eurosLimpios = 0, eurosRescatados = 0;
const porIntento = new Map();
for (const c of ok) {
  // Fallos de ese usuario en los 30 días previos a este cobro (su ciclo).
  const [[f]] = await db.query(
    `SELECT COUNT(*) n FROM charges
      WHERE userId = ? AND amountCents >= 1000 AND status <> 'ok'
        AND createdAt < ? AND createdAt >= DATE_SUB(?, INTERVAL 30 DAY)`,
    [c.userId, c.c_utc, c.c_utc]);
  const n = Number(f.n);
  porIntento.set(n, (porIntento.get(n) ?? 0) + 1);
  if (n === 0) { limpios++; eurosLimpios += c.amountCents; }
  else { rescatados++; eurosRescatados += c.amountCents; }
}

const total = limpios + rescatados;
console.log("████ COBROS RECURRENTES QUE ENTRARON ████");
console.log(`  a la primera:  ${String(limpios).padStart(4)}  (${(eurosLimpios / 100).toFixed(2)} €)`);
console.log(`  rescatados:    ${String(rescatados).padStart(4)}  (${(eurosRescatados / 100).toFixed(2)} €)`);
console.log(`  total:         ${String(total).padStart(4)}  → ${total ? Math.round(100 * rescatados / total) : 0} % del ingreso recurrente viene de un reintento`);

console.log("\n  desglose por intentos fallidos previos:");
for (const [n, c] of [...porIntento].sort((a, b) => a[0] - b[0])) {
  console.log(`    ${n === 0 ? "sin fallos previos" : `tras ${n} fallo(s)`}: ${c}`);
}
await db.end();
process.exit(0);

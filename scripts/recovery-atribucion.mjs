// READ-ONLY — ¿han recuperado pagos los emails de "tu archivo está listo"?
//
//   railway run node scripts/recovery-atribucion.mjs
//
// ATRIBUCIÓN: se cuenta como recuperado el usuario que (a) recibió al menos un
// email de recuperación, (b) NO tenía ningún alta pagada ANTES de ese email, y
// (c) pagó DESPUÉS. Es la definición más estricta que permiten los datos: sin
// clics registrados no se puede saber si abrió el correo, así que lo que sale
// es un techo — parte de esos pagos habrían ocurrido igual.
import { openDb, tzCols, tzShow } from "./_db.mjs";

const db = await openDb();
const eur = (c) => (c / 100).toFixed(2).replace(".", ",") + " €";

// ── universo: usuarios que recibieron algún email de recuperación ───────────
const [[uni]] = await db.query(
  `SELECT COUNT(DISTINCT userId) usuarios, COUNT(*) docs,
          ${tzCols("MIN(recoveryLastSentAt)", "desde")}, ${tzCols("MAX(recoveryLastSentAt)", "hasta")}
     FROM documents WHERE recoveryLastSentAt IS NOT NULL AND userId IS NOT NULL`);
console.log(`Emails de recuperación: ${uni.docs} documentos · ${uni.usuarios} usuarios distintos`);
console.log(`Periodo: ${tzShow(uni, "desde")}  →  ${tzShow(uni, "hasta")}\n`);

// ── recuperados: primer email, y si pagó después sin haber pagado antes ─────
const [rec] = await db.query(
  `SELECT r.userId, u.email,
          ${tzCols("r.primerEmail", "email_ts")},
          ${tzCols("p.primerPago", "pago_ts")},
          TIMESTAMPDIFF(HOUR, r.primerEmail, p.primerPago) horas,
          p.cents
     FROM (SELECT userId, MIN(recoveryLastSentAt) primerEmail
             FROM documents WHERE recoveryLastSentAt IS NOT NULL AND userId IS NOT NULL
            GROUP BY userId) r
     JOIN (SELECT userId, MIN(createdAt) primerPago, SUM(amountCents) cents
             FROM charges WHERE provider<>'mit' AND status='ok' GROUP BY userId) p
       ON p.userId = r.userId
     LEFT JOIN users u ON u.id = r.userId
    WHERE p.primerPago > r.primerEmail
    ORDER BY r.primerEmail`);

// Los que ya habían pagado ANTES del email no cuentan: el correo les llegó por
// un documento suelto sin pagar, no por ser clientes perdidos.
const [yaPagaban] = await db.query(
  `SELECT COUNT(DISTINCT r.userId) n
     FROM (SELECT userId, MIN(recoveryLastSentAt) primerEmail
             FROM documents WHERE recoveryLastSentAt IS NOT NULL AND userId IS NOT NULL
            GROUP BY userId) r
     JOIN (SELECT userId, MIN(createdAt) primerPago FROM charges
            WHERE provider<>'mit' AND status='ok' GROUP BY userId) p ON p.userId = r.userId
    WHERE p.primerPago <= r.primerEmail`);

console.log("████ PAGOS POSTERIORES AL EMAIL ████");
console.log(`  usuarios que pagaron DESPUÉS de recibir el email: ${rec.length}`);
console.log(`  (excluidos ${yaPagaban[0].n} que ya habían pagado antes de recibirlo)\n`);

// ── ventana temporal: cuanto más pegado al email, más creíble la atribución ──
const tramos = [
  ["≤ 1 h", (h) => h <= 1],
  ["1-6 h", (h) => h > 1 && h <= 6],
  ["6-24 h", (h) => h > 6 && h <= 24],
  ["1-3 días", (h) => h > 24 && h <= 72],
  ["3-7 días", (h) => h > 72 && h <= 168],
  ["> 7 días", (h) => h > 168],
];
console.log("  Retraso entre el email y el pago:");
for (const [etiqueta, test] of tramos) {
  const n = rec.filter((r) => test(Number(r.horas))).length;
  const cents = rec.filter((r) => test(Number(r.horas))).reduce((a, r) => a + Number(r.cents), 0);
  if (n) console.log(`    ${etiqueta.padEnd(9)} ${String(n).padStart(3)} usuarios   ${eur(cents)}`);
}

const creibles = rec.filter((r) => Number(r.horas) <= 24);
console.log(`\n  Atribución creíble (pago dentro de las 24 h siguientes al email): ${creibles.length} usuarios`);
console.log(`  Dinero de esos: ${eur(creibles.reduce((a, r) => a + Number(r.cents), 0))} de altas`);

// ¿y renovaron? Un alta recuperada solo vale si sobrevive al primer cobro.
if (creibles.length) {
  const ids = creibles.map((r) => r.userId);
  const [[mit]] = await db.query(
    `SELECT COUNT(*) cobros, COALESCE(SUM(amountCents),0) cents
       FROM charges WHERE provider='mit' AND status='ok' AND userId IN (${ids.map(() => "?").join(",")})`, ids);
  console.log(`  Renovaciones cobradas después a esos mismos usuarios: ${mit.cobros}  (${eur(mit.cents)})`);
  console.log(`\n  Detalle:`);
  for (const r of creibles.slice(0, 25))
    console.log(`    ${String(r.email ?? r.userId).padEnd(34)} email ${tzShow(r, "email_ts").slice(0, 16)} → pago +${r.horas} h`);
}

// ── contraste: cuánta gente recibió el email y NO pagó nunca ────────────────
const [[nunca]] = await db.query(
  `SELECT COUNT(DISTINCT r.userId) n
     FROM (SELECT DISTINCT userId FROM documents
            WHERE recoveryLastSentAt IS NOT NULL AND userId IS NOT NULL) r
     LEFT JOIN (SELECT DISTINCT userId FROM charges WHERE provider<>'mit' AND status='ok') p
       ON p.userId = r.userId
    WHERE p.userId IS NULL`);
console.log(`\n████ CONTRASTE ████`);
console.log(`  recibieron el email y NO han pagado nunca: ${nunca.n}`);
const tasa = uni.usuarios ? (100 * creibles.length) / uni.usuarios : 0;
console.log(`  tasa de recuperación (≤24 h) sobre los ${uni.usuarios} que recibieron email: ${tasa.toFixed(2)} %`);

await db.end();
process.exit(0);

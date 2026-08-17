// Ancla en cada suscripción existente el precio que su dueño ACEPTÓ, antes de
// subir el precio de las altas nuevas. Sin esto, la subida les llegaría a todos
// en su próxima renovación: cobrarle 39,95 € a quien autorizó 29,95 € es un
// contracargo con la razón de su parte.
//
// Fuentes, por orden de fiabilidad:
//   1. El último cobro de renovación que SÍ se le hizo (lo que ya pagó de verdad).
//   2. `consents.recurringCents` — el importe que se le mostró al autorizar.
//   3. El ajuste global vigente, como última red.
//
// Por defecto NO escribe: enseña lo que haría. Para aplicarlo, `--aplicar`.
//   railway run node scripts/backfill-precio-anclado.mjs
//   railway run node scripts/backfill-precio-anclado.mjs --aplicar
import { openDb, tzCols, tzShow } from "./_db.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}`);
console.log(APLICAR ? "MODO REAL: se van a escribir los anclajes\n" : "SIMULACIÓN (añade --aplicar para escribir)\n");

const [[cfg]] = await db.query(`SELECT value FROM site_settings WHERE \`key\`='subscription_price_eur' LIMIT 1`);
const globalCents = Math.round(Number(cfg?.value ?? "29.95") * 100);
console.log(`Precio global vigente: ${(globalCents / 100).toFixed(2)} €\n`);

// Solo las que no tienen anclaje. Se ancla TODA suscripción viva o recuperable:
// si mañana revive una past_due, debe cobrar su precio, no el nuevo.
const [subs] = await db.query(
  `SELECT s.id, s.userId, u.email, s.status, s.plan, s.recurringCents,
          ${tzCols("s.createdAt", "alta")}
     FROM subscriptions s JOIN users u ON u.id = s.userId
    WHERE s.recurringCents IS NULL
      AND s.status IN ('trialing','active','past_due')
    ORDER BY s.id`);
console.log(`Suscripciones sin anclar: ${subs.length}\n`);

const resumen = new Map();
let escritas = 0;
for (const s of subs) {
  const [[cobro]] = await db.query(
    `SELECT amountCents FROM charges
      WHERE userId = ? AND status='ok' AND amountCents >= 1000
      ORDER BY id DESC LIMIT 1`, [s.userId]);
  let cents = cobro?.amountCents ? Number(cobro.amountCents) : null;
  let fuente = cents ? "cobro real" : null;

  if (!cents) {
    const [[con]] = await db.query(
      `SELECT recurringCents FROM consents
        WHERE userId = ? AND recurringCents IS NOT NULL
        ORDER BY id DESC LIMIT 1`, [s.userId]).catch(() => [[null]]);
    if (con?.recurringCents) { cents = Number(con.recurringCents); fuente = "consentimiento"; }
  }
  if (!cents) { cents = globalCents; fuente = "ajuste global"; }

  const clave = `${(cents / 100).toFixed(2)} € (${fuente})`;
  resumen.set(clave, (resumen.get(clave) ?? 0) + 1);

  if (APLICAR) {
    await db.query(`UPDATE subscriptions SET recurringCents = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`, [cents, s.id]);
    escritas++;
  }
  if (subs.length <= 40) {
    console.log(`  sub#${s.id} <${s.email}> ${s.status}/${s.plan} → ${(cents / 100).toFixed(2)} € (${fuente})`);
  }
}

console.log("\n████ RESUMEN ████");
for (const [k, n] of [...resumen].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} × ${k}`);
console.log(APLICAR ? `\nEscritas: ${escritas}` : `\nNo se ha escrito nada. Repite con --aplicar.`);

await db.end();
process.exit(0);

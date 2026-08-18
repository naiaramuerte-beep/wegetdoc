// SOLO LECTURA. Los cobros que hay que devolver porque ya se lo hemos dicho por
// correo al cliente. Saca el id del cargo y el transaction_id para encontrarlos
// en el panel sin buscar a ciegas, y marca los que ya estén devueltos.
//   railway run node scripts/_chk-reembolsos-prometidos.mjs
import { openDb, tzCols, tzShow } from "./_db.mjs";
const PROMETIDOS = [
  ["christian.nmn@googlemail.com", 50],
  ["daud154151@gmail.com", 2995],
  ["sejgasbogdan215@gmail.com", 2995],
  ["muresianvasile@gmail.com", 2995],
  ["eugenioskr@gmail.com", 2995],
  ["barsaserhiy228@gmail.com", 2995],
  ["sainterose.simeon97215@gmail.com", 2995],
];
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);
let total = 0, pendientes = 0;
for (const [email, cents] of PROMETIDOS) {
  const [[u]] = await db.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
  if (!u) { console.log(`✗ <${email}> sin cuenta`); continue; }
  const [ch] = await db.query(
    `SELECT id, amountCents, refundedCents, status, sipayTransactionId, sipayMaskedCard, ${tzCols("createdAt", "c")}
       FROM charges WHERE userId = ? AND amountCents = ? AND status = 'ok'
      ORDER BY createdAt DESC LIMIT 1`, [u.id, cents]);
  if (!ch.length) { console.log(`✗ <${email}> no encuentro el cobro de ${(cents / 100).toFixed(2)} €`); continue; }
  const c = ch[0];
  const devuelto = Number(c.refundedCents ?? 0) >= Number(c.amountCents);
  if (!devuelto) { pendientes++; total += Number(c.amountCents); }
  console.log(`${devuelto ? "✓ YA DEVUELTO" : "· PENDIENTE  "}  cargo #${c.id}  ${(c.amountCents / 100).toFixed(2)} €  <${email}>`);
  console.log(`     ${tzShow(c, "c")}   txn ${c.sipayTransactionId ?? "-"}   tarjeta ${c.sipayMaskedCard ?? "-"}`);
}
console.log(`\nPendientes de devolver: ${pendientes} cargos = ${(total / 100).toFixed(2)} €`);
console.log("Se devuelven desde el panel (Facturación → Últimos cobros → Reembolsar).");
await db.end();
process.exit(0);

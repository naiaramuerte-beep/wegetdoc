// SOLO LECTURA. El camino del "upgrade de 1 clic": el usuario se topa con el
// límite de descargas de la prueba y PIDE pagar el mensual ya. Es la única compra
// del precio completo que hace la gente por voluntad propia, así que su tasa de
// aprobación dice si el precio se rechaza en la cabeza del cliente o en el banco.
//   railway run node scripts/_chk-upgrades.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 21);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [up] = await db.query(
  `SELECT id, userId, amountCents, status, provider, sipayOrder, errorDetail, ${tzCols("createdAt", "c")}
     FROM charges
    WHERE sipayOrder LIKE 'mit-upgrade-%' AND createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
    ORDER BY createdAt`, [DIAS]);

console.log(`████ UPGRADES PEDIDOS POR EL USUARIO (${DIAS} días): ${up.length} ████`);
for (const u of up) {
  console.log(`  ${u.status === "ok" ? "✓ COBRADO" : "✗ rechazado"}  ${(u.amountCents / 100).toFixed(2)} €  user=${u.userId}  ${tzShow(u, "c")}  ${u.errorDetail ? String(u.errorDetail).slice(0, 60) : ""}`);
}
const ok = up.filter(u => u.status === "ok").length;
console.log(`\nAprobación del upgrade: ${ok}/${up.length}${up.length ? "  (" + Math.round(100 * ok / up.length) + " %)" : ""}`);

// ¿Qué fue de los que pidieron pagar y les rechazaron? ¿Lo lograron por otra vía?
console.log("\n████ ¿QUÉ PASÓ DESPUÉS CON LOS RECHAZADOS? ████");
for (const u of up.filter(x => x.status !== "ok")) {
  const [post] = await db.query(
    `SELECT id, amountCents, status, provider, ${tzCols("createdAt", "c")} FROM charges
      WHERE userId = ? AND createdAt > ? ORDER BY createdAt LIMIT 3`, [u.userId, u.c_utc]);
  const [[sub]] = await db.query(
    `SELECT status, plan, cancelAtPeriodEnd, ${tzCols("currentPeriodEnd", "fin")} FROM subscriptions
      WHERE userId = ? ORDER BY id DESC LIMIT 1`, [u.userId]);
  console.log(`  user=${u.userId} rechazado ${u.c_mad}`);
  if (!post.length) console.log(`     después: NADA — se quedó sin poder pagar`);
  for (const p of post) console.log(`     después: ${(p.amountCents / 100).toFixed(2)} € ${p.provider} ${p.status} ${tzShow(p, "c")}`);
  if (sub) console.log(`     su suscripción hoy: ${sub.status}/${sub.plan}${sub.cancelAtPeriodEnd ? " (cancelada)" : ""} hasta ${sub.fin_mad}`);
}
await db.end();
process.exit(0);

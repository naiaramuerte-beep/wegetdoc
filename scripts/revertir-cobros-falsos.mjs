// Revierte los 5 cobros que scripts/cobrar-bloqueadas.mjs dio por buenos sin
// serlo (2026-08-12). Sipay devolvió un `transaction_id` con la operación
// DENEGADA (códigos 172/174/180, `authorization_id` vacío), y el script tomó la
// mera existencia del identificador como prueba de cobro.
//
//   railway run node scripts/revertir-cobros-falsos.mjs             ← SECO
//   railway run node scripts/revertir-cobros-falsos.mjs --ejecutar
//
// No hay dinero que devolver: nunca se capturó. Lo que hay que deshacer es el
// estado local — 5 filas en `charges` que dicen "ok" y 5 suscripciones
// reactivadas con acceso hasta el 11-sep sin haber pagado. Si se queda así, el
// panel miente sobre los ingresos y esos 5 usuarios tienen servicio gratis.
import { openDb, tzCols, tzShow } from "./_db.mjs";

const EJECUTAR = process.argv.includes("--ejecutar");
const TXNS = [
  "000315758546032828704", "000315758546032828710", "000315758546032828718",
  "000315758546032828734", "000315758546032828741",
];

const db = await openDb();

const [cargos] = await db.query(
  `SELECT id, userId, amountCents, sipayTransactionId, sipayOrder, ${tzCols("createdAt", "ts")}
     FROM charges WHERE sipayTransactionId IN (${TXNS.map(() => "?").join(",")})`, TXNS);

console.log(`Modo: ${EJECUTAR ? "✍️  REVERSIÓN REAL" : "🔍 SECO"}`);
console.log(`Cargos falsos encontrados: ${cargos.length}\n`);

const userIds = cargos.map((c) => c.userId);
if (!cargos.length) { console.log("Nada que revertir."); await db.end(); process.exit(0); }

const [subs] = await db.query(
  `SELECT id, userId, status, plan, ${tzCols("currentPeriodEnd", "fin")}, lastDeclineCode
     FROM subscriptions WHERE userId IN (${userIds.map(() => "?").join(",")})`, userIds);

for (const c of cargos) {
  const s = subs.find((x) => x.userId === c.userId);
  console.log(`  cargo #${c.id} u=${c.userId} ${(c.amountCents / 100).toFixed(2)}€ ${tzShow(c, "ts")}`);
  console.log(`     sub #${s?.id}: ${s?.status}/${s?.plan} con acceso hasta ${s ? tzShow(s, "fin") : "?"}`);
}

if (!EJECUTAR) {
  console.log(`\n🔍 Seco. Para revertir:\n   railway run node scripts/revertir-cobros-falsos.mjs --ejecutar`);
  await db.end(); process.exit(0);
}

// 1) Fuera los cargos que nunca ocurrieron.
const [del] = await db.query(
  `DELETE FROM charges WHERE sipayTransactionId IN (${TXNS.map(() => "?").join(",")})`, TXNS);
console.log(`\n✅ Cargos borrados: ${del.affectedRows}`);

// 2) Las subs vuelven a past_due con su código de bloqueo. No se restaura la
//    fecha de vencimiento anterior porque el script la sobrescribió y no quedó
//    copia; se deja vencida en el momento del intento, que es lo que refleja la
//    realidad: siguen debiendo el mes y sin acceso.
for (const c of cargos) {
  await db.query(
    `UPDATE subscriptions
        SET status='past_due', plan='monthly',
            currentPeriodEnd=?, declineCategory='blocked_provider',
            updatedAt=UTC_TIMESTAMP()
      WHERE userId=? AND currentPeriodEnd > UTC_TIMESTAMP()`,
    [new Date(c.createdAt), c.userId]);
}
console.log(`✅ Suscripciones devueltas a past_due / blocked_provider`);

const [comprob] = await db.query(
  `SELECT userId, status, declineCategory, ${tzCols("currentPeriodEnd", "fin")}
     FROM subscriptions WHERE userId IN (${userIds.map(() => "?").join(",")})`, userIds);
console.log("\nEstado final:");
for (const s of comprob) console.log(`  u=${s.userId} ${s.status} ${s.declineCategory} · fin ${tzShow(s, "fin")}`);

await db.end();
process.exit(0);

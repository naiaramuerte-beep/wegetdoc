// Cambia el precio de la suscripción para las ALTAS NUEVAS.
//
// SEGURO solo si antes se ha corrido `backfill-precio-anclado.mjs`: el cron cobra
// a cada suscripción su `recurringCents`, así que las existentes no se enteran de
// este cambio. El script se NIEGA a subir el precio si queda alguna sin anclar,
// que es exactamente el error que causaría cobros no autorizados.
//
//   railway run node scripts/subir-precio.mjs 39.90
//   railway run node scripts/subir-precio.mjs 39.90 --aplicar
import { openDb, tzCols, tzShow } from "./_db.mjs";

const nuevo = Number(process.argv[2]);
const APLICAR = process.argv.includes("--aplicar");
if (!Number.isFinite(nuevo) || nuevo <= 0 || nuevo > 99) {
  console.error("Uso: node scripts/subir-precio.mjs <euros> [--aplicar]   (p. ej. 39.90)");
  process.exit(1);
}
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [[actual]] = await db.query(`SELECT value FROM site_settings WHERE \`key\`='subscription_price_eur' LIMIT 1`);
console.log(`Precio actual de altas nuevas: ${actual?.value ?? "(sin fijar)"} €`);
console.log(`Precio nuevo:                  ${nuevo.toFixed(2)} €\n`);

// Candado: si alguien se quedó sin anclar, este cambio le subiría el recibo.
const [[pend]] = await db.query(
  `SELECT COUNT(*) n FROM subscriptions
    WHERE recurringCents IS NULL AND status IN ('trialing','active','past_due')`);
if (Number(pend.n) > 0) {
  console.error(`ABORTADO: ${pend.n} suscripciones sin precio anclado.`);
  console.error("Corre antes: railway run node scripts/backfill-precio-anclado.mjs --aplicar");
  await db.end();
  process.exit(1);
}
console.log("✓ Todas las suscripciones existentes tienen su precio anclado: no les afecta.");

const [rep] = await db.query(
  `SELECT recurringCents c, COUNT(*) n FROM subscriptions
    WHERE status IN ('trialing','active','past_due') GROUP BY c ORDER BY n DESC`);
for (const r of rep) console.log(`    ${r.n} seguirán pagando ${(r.c / 100).toFixed(2)} €`);

if (!APLICAR) {
  console.log("\nSIMULACIÓN — no se ha cambiado nada. Repite con --aplicar.");
  await db.end();
  process.exit(0);
}

const valor = nuevo.toFixed(2);
await db.query(
  `INSERT INTO site_settings (\`key\`, value, updatedAt) VALUES ('subscription_price_eur', ?, UTC_TIMESTAMP())
   ON DUPLICATE KEY UPDATE value = VALUES(value), updatedAt = UTC_TIMESTAMP()`, [valor]);
const [[ver]] = await db.query(`SELECT value FROM site_settings WHERE \`key\`='subscription_price_eur' LIMIT 1`);
console.log(`\n✓ Precio de altas nuevas fijado en ${ver.value} €`);

await db.end();
process.exit(0);

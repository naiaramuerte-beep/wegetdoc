// SOLO LECTURA. Próximas renovaciones: a quién le toca, cuándo y por cuánto,
// leyendo el precio ANCLADO de cada una. Sirve para saber a qué hora cae la
// primera comprobación real de que la subida no toca a los que ya estaban.
//   railway run node scripts/_chk-proximas-renov.mjs [horas]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const HORAS = Number(process.argv[2] ?? 12);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [r] = await db.query(
  `SELECT s.id, s.userId, u.email, s.status, s.recurringCents, s.sipayProvider,
          ${tzCols("s.currentPeriodEnd", "vence")}
     FROM subscriptions s JOIN users u ON u.id = s.userId
    WHERE s.status IN ('trialing','active') AND s.cancelAtPeriodEnd = 0
      AND s.sipayToken IS NOT NULL AND s.sipayToken <> ''
      AND s.currentPeriodEnd > UTC_TIMESTAMP()
      AND s.currentPeriodEnd <= UTC_TIMESTAMP() + INTERVAL ? HOUR
    ORDER BY s.currentPeriodEnd LIMIT 25`, [HORAS]);

console.log(`████ RENOVACIONES EN LAS PRÓXIMAS ${HORAS} H (${r.length}) ████`);
for (const x of r) {
  const precio = x.recurringCents == null ? "SIN ANCLAR ⚠" : `${(x.recurringCents / 100).toFixed(2)} €`;
  console.log(`  sub#${x.id} <${x.email}> ${x.status}/${x.sipayProvider ?? "-"} → ${precio}   vence ${tzShow(x, "vence")}`);
}
if (!r.length) console.log("  (ninguna en esa ventana)");

const [[sig]] = await db.query(
  `SELECT ${tzCols("MIN(currentPeriodEnd)", "prox")} FROM subscriptions
    WHERE status IN ('trialing','active') AND cancelAtPeriodEnd = 0
      AND sipayToken IS NOT NULL AND sipayToken <> '' AND currentPeriodEnd > UTC_TIMESTAMP()`);
console.log(`\nPrimera renovación futura: ${tzShow(sig, "prox")}`);
await db.end();
process.exit(0);

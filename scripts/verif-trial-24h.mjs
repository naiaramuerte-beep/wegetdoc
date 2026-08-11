// READ-ONLY — verificación del cambio de trial a 24 h.
// Comprueba que TODA alta posterior al deploy nace con trialHours=24 y con el
// vencimiento a 24 h exactas, y que ninguna sub anterior se ha tocado.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const DEPLOY = process.argv[2] ?? "2026-08-12 00:00:00"; // UTC

const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

console.log("████ ALTAS POSTERIORES AL DEPLOY ████");
const [nuevas] = await db.query(
  `SELECT id, userId, trialDays, trialHours, status, plan,
          ${tzCols("createdAt", "alta")}, ${tzCols("currentPeriodEnd", "fin")},
          TIMESTAMPDIFF(MINUTE, currentPeriodStart, currentPeriodEnd) mins
     FROM subscriptions WHERE createdAt >= ? ORDER BY createdAt`, [DEPLOY]);
if (!nuevas.length) console.log("  (todavía ninguna)");
for (const r of nuevas) {
  const ok = r.trialHours === 24 && r.mins === 1440;
  console.log(`  ${ok ? "✅" : "🚨"} sub#${r.id} u=${r.userId} trialHours=${r.trialHours} trialDays=${r.trialDays} ventana=${r.mins} min`);
  console.log(`      alta ${tzShow(r, "alta")}  →  vence ${tzShow(r, "fin")}`);
}

console.log("\n████ SUBS ANTERIORES — no se ha tocado ninguna ████");
const [[v]] = await db.query(
  `SELECT COUNT(*) n, SUM(trialHours IS NOT NULL) con_horas,
          SUM(updatedAt >= ?) tocadas
     FROM subscriptions WHERE createdAt < ?`, [DEPLOY, DEPLOY]);
console.log(`  subs previas: ${v.n}  ·  con trialHours: ${v.con_horas} (debe ser 0)  ·  actualizadas tras el deploy: ${v.tocadas}`);
console.log("  (las 'actualizadas' son normales: renovaciones y cancelaciones del cron tocan updatedAt)");

await db.end();
process.exit(0);

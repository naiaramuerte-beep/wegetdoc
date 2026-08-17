// SOLO LECTURA. Cuándo cambió el precio de la suscripción. Los cambios de
// ajustes quedan en `audit_log` (acción update_pricing), y los cobros reales
// dicen qué importe estaba vigente en cada momento. Sirve para anclar por fecha
// a quien no tiene ni cobro ni consentimiento.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();

console.log("████ CAMBIOS DE PRECIO REGISTRADOS EN AUDITORÍA ████");
try {
  const [a] = await db.query(
    `SELECT id, action, detail, ${tzCols("createdAt", "c")} FROM audit_log
      WHERE action LIKE '%pricing%' OR detail LIKE '%subscription_price%'
      ORDER BY id DESC LIMIT 20`);
  if (!a.length) console.log("  (ninguno registrado)");
  for (const r of a) console.log(`  #${r.id} ${r.action}  ${String(r.detail ?? "").slice(0, 90)}  ${tzShow(r, "c")}`);
} catch (e) { console.log("  (audit_log: " + e.message + ")"); }

console.log("\n████ IMPORTES DE RENOVACIÓN REALMENTE COBRADOS, POR MES ████");
const [c] = await db.query(
  `SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'),'%Y-%m') mes,
          amountCents, COUNT(*) n,
          ${tzCols("MIN(createdAt)", "primero")}, ${tzCols("MAX(createdAt)", "ultimo")}
     FROM charges WHERE amountCents >= 1000 AND status='ok'
    GROUP BY mes, amountCents ORDER BY mes, amountCents`);
for (const r of c) {
  console.log(`  ${r.mes}  ${(r.amountCents / 100).toFixed(2)} € × ${String(r.n).padStart(4)}   ${tzShow(r, "primero")} → ${tzShow(r, "ultimo")}`);
}

console.log("\n████ LAS 396 SIN ANCLAR, POR MES DE ALTA ████");
const [s] = await db.query(
  `SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'),'%Y-%m') mes, COUNT(*) n,
          SUM(status='trialing') enPrueba, SUM(status='active') activas, SUM(status='past_due') impagadas
     FROM subscriptions
    WHERE recurringCents IS NULL AND status IN ('trialing','active','past_due')
    GROUP BY mes ORDER BY mes`);
for (const r of s) console.log(`  ${r.mes}: ${String(r.n).padStart(4)}  (prueba ${r.enPrueba}, activas ${r.activas}, impagadas ${r.impagadas})`);

await db.end();
process.exit(0);

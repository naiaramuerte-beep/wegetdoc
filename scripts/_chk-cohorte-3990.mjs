// SOLO LECTURA. La primera cohorte al precio nuevo: quién está anclado a 39,90 €,
// cuándo le toca su primer cobro y qué ha pasado ya. El aviso de Telegram muestra
// el importe REAL del cargo (recordCharge → notifySale), así que en cuanto entre
// el primero se verá "39,90 €" en el móvil.
//   railway run node scripts/_chk-cohorte-3990.mjs
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [[r]] = await db.query(
  `SELECT COUNT(*) n,
          SUM(status='trialing') enPrueba,
          SUM(cancelAtPeriodEnd=1) canceladas,
          SUM(currentPeriodEnd <= UTC_TIMESTAMP()) yaVencidas
     FROM subscriptions WHERE recurringCents = 3990`);
console.log(`Ancladas a 39,90 €: ${r.n}   en prueba: ${r.enPrueba}   canceladas antes de cobrar: ${r.canceladas}   ya vencidas: ${r.yaVencidas}`);

const [prox] = await db.query(
  `SELECT id, userId, status, sipayProvider, cancelAtPeriodEnd, ${tzCols("currentPeriodEnd", "vence")}
     FROM subscriptions
    WHERE recurringCents = 3990 AND status IN ('trialing','active')
    ORDER BY currentPeriodEnd LIMIT 30`);
console.log(`\n████ PRIMEROS COBROS A 39,90 € ████`);
for (const s of prox) {
  const estado = s.cancelAtPeriodEnd ? "CANCELADA (no se cobrará)" : (s.vence_utc <= t.ahora_utc ? "vencida, le toca ya" : "pendiente");
  console.log(`  sub#${s.id} user=${s.userId} ${s.sipayProvider ?? "-"}  vence ${tzShow(s, "vence")}  → ${estado}`);
}

const [ya] = await db.query(
  `SELECT id, userId, amountCents, status, ${tzCols("createdAt", "c")} FROM charges
    WHERE amountCents = 3990 ORDER BY createdAt DESC LIMIT 10`);
console.log(`\n████ COBROS DE 39,90 € YA REALIZADOS (${ya.length}) ████`);
if (!ya.length) console.log("  (ninguno todavía: el primero que entre será el primer 39,90 € en Telegram)");
for (const c of ya) console.log(`  #${c.id} user=${c.userId} ${(c.amountCents / 100).toFixed(2)}€ ${c.status} ${tzShow(c, "c")}`);

await db.end();
process.exit(0);

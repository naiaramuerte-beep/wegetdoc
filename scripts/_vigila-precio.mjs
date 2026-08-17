// SOLO LECTURA. Vigila que la subida de precio hace lo correcto en producción:
//  · las renovaciones de los que ya estaban siguen siendo de 29,95 € (o 19,95 €)
//  · las altas NUEVAS nacen con 39,90 € anclado
// Sale en cuanto ve una de las dos cosas, o al agotar el tiempo.
//   railway run node scripts/_vigila-precio.mjs [minutos]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const MINUTOS = Number(process.argv[2] ?? 25);
const db = await openDb();
const [[t0]] = await db.query(`SELECT UTC_TIMESTAMP() ahora`);
const desde = t0.ahora;
console.log(`Vigilando desde ${desde.toISOString()} durante ${MINUTOS} min...`);
const hasta = Date.now() + MINUTOS * 60000;

while (Date.now() < hasta) {
  const [ren] = await db.query(
    `SELECT id, userId, amountCents, status, ${tzCols("createdAt", "c")} FROM charges
      WHERE amountCents >= 1000 AND createdAt > ? ORDER BY id`, [desde]);
  for (const r of ren) {
    const ok = r.amountCents === 2995 || r.amountCents === 1995;
    console.log(`${ok ? "✓" : "✗ ¡OJO!"} RENOVACIÓN user=${r.userId} ${(r.amountCents / 100).toFixed(2)} € ${r.status} ${tzShow(r, "c")}` +
      (ok ? " — precio anclado respetado" : " — ¡se ha cobrado el precio nuevo a alguien que ya estaba!"));
  }
  const [alt] = await db.query(
    `SELECT id, userId, recurringCents, ${tzCols("createdAt", "c")} FROM subscriptions
      WHERE createdAt > ? ORDER BY id`, [desde]);
  for (const a of alt) {
    console.log(`${a.recurringCents === 3990 ? "✓" : "✗"} ALTA NUEVA sub#${a.id} user=${a.userId} anclada a ${a.recurringCents == null ? "(nada)" : (a.recurringCents / 100).toFixed(2) + " €"} ${tzShow(a, "c")}`);
  }
  if (ren.length || alt.length) break;
  await new Promise(r => setTimeout(r, 60000));
}
console.log("fin de la vigilancia");
await db.end();
process.exit(0);

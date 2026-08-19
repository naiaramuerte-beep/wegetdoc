// SOLO LECTURA. Espera al primer cobro APROBADO de 39,90 € — el que hará sonar
// el primer «cha-ching» del precio nuevo en Telegram — e informa también de los
// rechazos que vayan cayendo mientras tanto, para no confundir "aún no ha sonado"
// con "no funciona".
//   railway run node scripts/_vigila-3990.mjs [minutos]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const MIN = Number(process.argv[2] ?? 45);
const db = await openDb();
const [[t0]] = await db.query(`SELECT UTC_TIMESTAMP() ahora`);
const desde = t0.ahora;
console.log(`Vigilando cobros de 39,90 € desde ${desde.toISOString()} durante ${MIN} min...`);
const hasta = Date.now() + MIN * 60000;
let visto = 0;
while (Date.now() < hasta) {
  const [ch] = await db.query(
    `SELECT id, userId, status, provider, ${tzCols("createdAt", "c")} FROM charges
      WHERE amountCents = 3990 AND createdAt > ? ORDER BY id`, [desde]);
  for (const c of ch.slice(visto)) {
    console.log(`${c.status === "ok" ? "✓ COBRADO 39,90 €" : "✗ rechazado 39,90 €"}  user=${c.userId} ${c.provider} ${tzShow(c, "c")}`);
  }
  if (ch.length > visto) {
    visto = ch.length;
    if (ch.some(c => c.status === "ok")) { console.log("→ Telegram ya ha mostrado 39,90 €."); break; }
  }
  await new Promise(r => setTimeout(r, 60000));
}
console.log("fin de la vigilancia");
await db.end();
process.exit(0);

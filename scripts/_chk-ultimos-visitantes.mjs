// SOLO LECTURA. Qué hizo cada persona que se registró en las últimas horas:
// cuándo se registró, cuántos documentos subió y si llegó a intentar pagar.
// Para ver si se paran en el pago o es que simplemente son poquísimos.
//   railway run node scripts/_chk-ultimos-visitantes.mjs [horas]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const HORAS = Number(process.argv[2] ?? 6);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (últimas ${HORAS} h)`);
console.log(`Cambio de precio a 39,90 €: 2026-08-17 18:57 UTC / 20:57 Madrid\n`);

const [us] = await db.query(
  `SELECT id, email, loginMethod, ${tzCols("createdAt", "c")} FROM users
    WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR ORDER BY createdAt`, [HORAS]);

for (const u of us) {
  const [[d]] = await db.query(`SELECT COUNT(*) n FROM documents WHERE userId = ?`, [u.id]);
  const [[c]] = await db.query(`SELECT COUNT(*) n FROM charges WHERE userId = ?`, [u.id]);
  const [ev] = await db.query(
    `SELECT eventType, ${tzCols("receivedAt", "r")} FROM webhook_events
      WHERE payload LIKE ? ORDER BY receivedAt`, [`%"userId":${u.id}%`]);
  const intentos = ev.map(e => `${e.eventType}@${e.r_mad.slice(11, 16)}`).join(" · ") || "ningún intento de pago";
  console.log(`#${u.id} <${u.email}> via=${u.loginMethod}  registro ${tzShow(u, "c")}`);
  console.log(`     documentos=${d.n}  cobros=${c.n}  →  ${intentos}`);
}
if (!us.length) console.log("(nadie se ha registrado en esa ventana)");
await db.end();
process.exit(0);

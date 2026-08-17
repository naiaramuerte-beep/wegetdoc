// SOLO LECTURA. Los hechos de cada persona con mensaje sin responder: cuándo se
// dio de alta, qué se le cobró y cuándo, si canceló y hasta cuándo tiene
// servicio. Sin esto, una respuesta a una queja de cobro se escribe a ciegas — y
// una fecha inventada en un correo a un cliente es un problema, no un detalle.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [ms] = await db.query(
  `SELECT DISTINCT m.email, m.name FROM contact_messages m
    WHERE m.repliedAt IS NULL AND m.archivedAt IS NULL`);
for (const m of ms) {
  const [[u]] = await db.query(`SELECT id, language, ${tzCols("createdAt", "c")} FROM users WHERE email = ? LIMIT 1`, [m.email]);
  console.log(`\n══ <${m.email}> ${m.name}`);
  if (!u) { console.log("   sin cuenta con ese email"); continue; }
  console.log(`   userId=${u.id} idioma=${u.language} registro ${tzShow(u, "c")}`);
  const [ch] = await db.query(
    `SELECT id, provider, amountCents, status, sipayTransactionId, sipayMaskedCard, ${tzCols("createdAt", "c")}
       FROM charges WHERE userId = ? ORDER BY createdAt`, [u.id]);
  for (const c of ch) {
    console.log(`   cobro #${c.id} ${c.provider} ${(c.amountCents / 100).toFixed(2)}€ ${c.status} ${tzShow(c, "c")} txn=${c.sipayTransactionId ?? "-"} tarjeta=${c.sipayMaskedCard ?? "-"}`);
  }
  const [su] = await db.query(
    `SELECT id, status, plan, recurringCents, cancelAtPeriodEnd, ${tzCols("currentPeriodEnd", "fin")}, ${tzCols("createdAt", "alta")}
       FROM subscriptions WHERE userId = ? ORDER BY id DESC`, [u.id]);
  for (const s of su) {
    console.log(`   sub#${s.id} ${s.status}/${s.plan} ${s.recurringCents ? (s.recurringCents / 100).toFixed(2) + "€" : "?"} cancelaAlFin=${!!s.cancelAtPeriodEnd} alta ${tzShow(s, "alta")} vence ${tzShow(s, "fin")}`);
  }
  const [[doc]] = await db.query(`SELECT COUNT(*) n FROM documents WHERE userId = ?`, [u.id]);
  console.log(`   documentos: ${doc.n}`);
}
await db.end();
process.exit(0);

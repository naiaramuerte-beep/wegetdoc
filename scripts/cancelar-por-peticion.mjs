// Cancela las suscripciones de quienes lo han pedido por escrito y todavía las
// tienen activas. Marca `cancelAtPeriodEnd = 1`, que es lo mismo que hace el
// botón del panel: el cliente conserva el servicio que ya ha pagado hasta el
// final del periodo y el cron NO le vuelve a cobrar (getSubsDueForRetry filtra
// por cancelAtPeriodEnd = 0).
//
// NO mueve dinero: los reembolsos van aparte, con el botón «Reembolsar».
// Simula por defecto.
//   railway run node scripts/cancelar-por-peticion.mjs
//   railway run node scripts/cancelar-por-peticion.mjs --aplicar
import { openDb, tzCols, tzShow } from "./_db.mjs";

const APLICAR = process.argv.includes("--aplicar");
// Quién y por qué, para que quede el rastro de la decisión junto al cambio.
const CASOS = [
  { email: "christian.nmn@googlemail.com", motivo: "mensaje #173: pagó y no recibió su Word; su prueba vence HOY 15:37" },
  { email: "daud154151@gmail.com", motivo: "mensaje #167: pidió reembolso el 14-ago y seguía activa" },
];

const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}`);
console.log(APLICAR ? "MODO REAL\n" : "SIMULACIÓN (añade --aplicar)\n");

for (const c of CASOS) {
  const [[u]] = await db.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [c.email]);
  if (!u) { console.log(`✗ <${c.email}> sin cuenta`); continue; }
  const [subs] = await db.query(
    `SELECT id, status, plan, cancelAtPeriodEnd, ${tzCols("currentPeriodEnd", "fin")}
       FROM subscriptions WHERE userId = ? AND status IN ('trialing','active','past_due')`, [u.id]);
  if (!subs.length) { console.log(`• <${c.email}> sin suscripción viva`); continue; }
  for (const s of subs) {
    if (s.cancelAtPeriodEnd) { console.log(`• sub#${s.id} <${c.email}> ya estaba cancelada`); continue; }
    console.log(`→ sub#${s.id} <${c.email}> ${s.status}/${s.plan} vence ${tzShow(s, "fin")}`);
    console.log(`   motivo: ${c.motivo}`);
    if (APLICAR) {
      await db.query(
        `UPDATE subscriptions SET cancelAtPeriodEnd = 1, updatedAt = UTC_TIMESTAMP() WHERE id = ?`, [s.id]);
      console.log(`   ✓ cancelada: no se le volverá a cobrar`);
    }
  }
}
if (!APLICAR) console.log("\nNo se ha cambiado nada. Repite con --aplicar.");
await db.end();
process.exit(0);

// Migración 0026: borra las tres columnas de Stripe de `subscriptions`.
// Verificado antes de escribirla: de 669 filas, la única con valores es la cuenta
// de cortesía del dueño y sus identificadores son falsos (los puso el endpoint de
// QA, que ya usa `sipayOrder = 'fake_qa_…'`). No se pierde ningún dato de cliente;
// el histórico real de cobros vive en `charges` y `webhook_events`.
//
// Comprueba antes de borrar y ABORTA si encontrara datos reales.
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);
const [chk] = await db.query(
  `SELECT COUNT(*) reales FROM subscriptions
    WHERE ((stripeCustomerId IS NOT NULL AND stripeCustomerId <> '' AND stripeCustomerId NOT LIKE 'fake_%')
       OR (stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '' AND stripeSubscriptionId NOT LIKE 'fake_%'))`);
if (Number(chk[0].reales) > 0) {
  console.error(`ABORTADO: ${chk[0].reales} filas con identificadores REALES de Stripe. Revisa antes de borrar.`);
  await db.end();
  process.exit(1);
}
console.log("✓ Ninguna fila con identificadores reales de Stripe. Procedo.");

const sql = fs.readFileSync("drizzle/0026_drop_stripe_columns.sql", "utf-8");
for (const st of sql.split("--> statement-breakpoint").map(x => x.trim()).filter(Boolean)) {
  try { await db.query(st); console.log("✓ " + st.split("\n").filter(l => !l.startsWith("--")).join(" ").slice(0, 90)); }
  catch (err) {
    if (err.code === "ER_CANT_DROP_FIELD_OR_KEY") console.log("• ya no existía");
    else console.error("✗ " + err.message);
  }
}
const [cols] = await db.query("SHOW COLUMNS FROM subscriptions LIKE 'stripe%'");
console.log(`\nColumnas stripe* que quedan: ${cols.length}`);
await db.end();

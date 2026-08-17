// SOLO LECTURA. ¿Está la columna del precio anclado y cuántas filas faltan por
// anclar? Comprobación previa y posterior al backfill del precio.
import { openDb } from "./_db.mjs";
const db = await openDb();
const [c] = await db.query("SHOW COLUMNS FROM subscriptions LIKE 'recurringCents'");
console.log("columna recurringCents:", c.length ? `${c[0].Type}, admite NULL=${c[0].Null}` : "NO EXISTE");
const [n] = await db.query(
  `SELECT COUNT(*) n, SUM(recurringCents IS NULL) sinAnclar
     FROM subscriptions WHERE status IN ('trialing','active','past_due')`);
console.log(`suscripciones cobrables: ${n[0].n}   sin anclar: ${n[0].sinAnclar}`);
const [rep] = await db.query(
  `SELECT recurringCents, COUNT(*) n FROM subscriptions
    WHERE status IN ('trialing','active','past_due') GROUP BY recurringCents ORDER BY n DESC`);
console.log("reparto por precio anclado:");
for (const r of rep) console.log(`  ${r.recurringCents == null ? "(sin anclar)" : (r.recurringCents / 100).toFixed(2) + " €"} → ${r.n}`);
await db.end();
process.exit(0);

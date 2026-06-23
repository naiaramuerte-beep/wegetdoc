/**
 * Purge ALL Stripe-era rows from webhook_events. The admin Webhooks
 * tab was full of legacy noise from before the Sipay migration —
 * "Invalid time value" errors from the deleted Stripe handler that
 * could be mistaken for current payment failures.
 *
 * Run with:  railway run node scripts/purge-stripe-webhooks.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [before] = await db.execute(`
    SELECT provider, COUNT(*) as n FROM webhook_events GROUP BY provider
  `);
  console.log("Before:");
  console.table(before);

  // Two layers: rows tagged provider='stripe' AND legacy rows that pre-date
  // the provider column (created with provider DEFAULT 'stripe') whose
  // eventType still uses Stripe's dotted naming convention.
  const [del1] = await db.execute(`DELETE FROM webhook_events WHERE provider = 'stripe'`);
  console.log(`Deleted ${del1.affectedRows} rows where provider='stripe'.`);

  const [del2] = await db.execute(`
    DELETE FROM webhook_events
    WHERE eventType LIKE 'customer.%'
       OR eventType LIKE 'invoice.%'
       OR eventType LIKE 'charge.%'
       OR eventType LIKE 'checkout.%'
       OR eventType LIKE 'payment_intent.%'
       OR eventType LIKE 'setup_intent.%'
  `);
  console.log(`Deleted ${del2.affectedRows} rows with Stripe-style eventType.`);

  const [after] = await db.execute(`
    SELECT provider, COUNT(*) as n FROM webhook_events GROUP BY provider
  `);
  console.log("\nAfter:");
  console.table(after);
} catch (err) {
  console.error("❌ Error:", err);
} finally {
  await db.end();
}

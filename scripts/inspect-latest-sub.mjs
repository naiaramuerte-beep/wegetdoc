// Read-only — shows the most recent subscriptions + charges so we can
// verify a fresh Sipay payment landed correctly.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log(`\n=== Inspect latest sub @ ${new Date().toISOString()} ===\n`);

// Latest 5 subs (newest first)
const [subs] = await db.query(`
  SELECT s.id, s.userId, u.email, s.plan, s.status,
         s.sipayProvider, s.sipayMaskedCard,
         LEFT(COALESCE(s.sipayTransactionId, ''), 32) AS sipayTxn,
         LEFT(COALESCE(s.sipayToken, ''), 24)         AS tokenShort,
         s.currentPeriodStart, s.currentPeriodEnd,
         s.cancelAtPeriodEnd,
         s.createdAt, s.updatedAt
  FROM subscriptions s
  LEFT JOIN users u ON u.id = s.userId
  ORDER BY s.createdAt DESC
  LIMIT 5
`);
console.log("Latest 5 subscriptions:");
console.table(subs);

// Latest 10 charges
const [charges] = await db.query(`
  SELECT c.id, c.userId, u.email, c.provider, c.amountCents, c.status,
         LEFT(COALESCE(c.sipayTransactionId, ''), 32) AS sipayTxn,
         c.sipayOrder, c.sipayMaskedCard,
         LEFT(COALESCE(c.errorDetail, ''), 80) AS errorDetail,
         c.createdAt
  FROM charges c
  LEFT JOIN users u ON u.id = c.userId
  ORDER BY c.id DESC
  LIMIT 10
`);
console.log("\nLatest 10 charges:");
console.table(charges);

// Latest 10 webhook events
const [events] = await db.query(`
  SELECT id, provider, eventType, status,
         LEFT(COALESCE(eventId, ''), 32) AS eventId,
         LEFT(COALESCE(errorMessage, ''), 60) AS errorMessage,
         durationMs, receivedAt
  FROM webhook_events
  ORDER BY id DESC
  LIMIT 10
`);
console.log("\nLatest 10 webhook_events:");
console.table(events);

await db.end();
console.log("\nDone.\n");

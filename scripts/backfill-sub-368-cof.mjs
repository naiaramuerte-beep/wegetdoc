// One-shot backfill: stamp the cof_id from webhook_events.id=4071
// (apay_intro_charge event) into subscriptions.id=368.sipayToken so the
// MIT-R cron picks it up at renewal. After this row is fixed we don't
// need to run anything else — future charges store cof_id correctly
// thanks to the code fix in routers.ts.

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const SUB_ID = 368;
const COF_ID = "792026170130459";

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Sanity check first
const [before] = await db.query(
  `SELECT id, userId, sipayProvider, sipayToken, sipayTransactionId, sipayMaskedCard
   FROM subscriptions WHERE id = ?`,
  [SUB_ID],
);
if (!before[0]) {
  console.error(`No subscription with id=${SUB_ID}. Aborting.`);
  await db.end();
  process.exit(1);
}
console.log("Before:");
console.table(before);

const [r] = await db.query(
  `UPDATE subscriptions SET sipayToken = ?, updatedAt = NOW() WHERE id = ? AND (sipayToken IS NULL OR sipayToken = '')`,
  [COF_ID, SUB_ID],
);
console.log(`\nUPDATE affected rows: ${r.affectedRows} (changedRows: ${r.changedRows})`);

const [after] = await db.query(
  `SELECT id, userId, sipayProvider, sipayToken, sipayTransactionId, sipayMaskedCard
   FROM subscriptions WHERE id = ?`,
  [SUB_ID],
);
console.log("\nAfter:");
console.table(after);

await db.end();

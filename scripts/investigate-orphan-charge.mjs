// Investigates orphan Sipay charges: cases where Sipay collected money
// but our DB doesn't have the matching subscription row. Read-only by
// default — pass `--fix` to create the missing subscription.
//
// Usage:
//   railway run node scripts/investigate-orphan-charge.mjs <userId> <sipayTxId>
//   railway run node scripts/investigate-orphan-charge.mjs 53376 174355749
//   railway run node scripts/investigate-orphan-charge.mjs 53376 174355749 --fix

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const userId = Number(process.argv[2]);
const sipayTxId = process.argv[3];
const FIX = process.argv.includes("--fix");

if (!userId || !sipayTxId) {
  console.error("Usage: node investigate-orphan-charge.mjs <userId> <sipayTxId> [--fix]");
  process.exit(1);
}

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log(`\n=== Investigating userId=${userId}, sipayTxId=${sipayTxId} ===\n`);

// 1) Who is this user?
const [users] = await db.query(
  `SELECT id, email, name, createdAt FROM users WHERE id = ?`,
  [userId],
);
if (!users[0]) {
  console.error(`❌ No user with id=${userId}. Ticket may not match our format.`);
  await db.end();
  process.exit(1);
}
console.log("USER:");
console.table(users);

// 2) Any subscription rows for this user?
const [subs] = await db.query(
  `SELECT id, plan, status, currentPeriodStart, currentPeriodEnd,
          sipayProvider, sipayTransactionId, sipayOrder, sipayMaskedCard,
          cancelAtPeriodEnd, createdAt
   FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC`,
  [userId],
);
console.log(`\nSUBSCRIPTIONS for user ${userId} (${subs.length} rows):`);
if (subs.length === 0) {
  console.log("  ⚠️  NONE — orphan charge confirmed.");
} else {
  console.table(subs);
}

// 3) Any webhook_events mentioning this user's order or txn?
const [evts] = await db.query(
  `SELECT id, eventType, eventId, status, errorMessage, createdAt
   FROM webhook_events
   WHERE eventId LIKE ?
      OR eventId = ?
      OR JSON_SEARCH(payload, 'one', ?) IS NOT NULL
   ORDER BY createdAt DESC
   LIMIT 30`,
  [`sipay-${userId}-%`, sipayTxId, String(userId)],
);
console.log(`\nWEBHOOK_EVENTS related (${evts.length} rows):`);
if (evts.length === 0) {
  console.log("  ⚠️  NONE — Sipay callback never reached our backend.");
} else {
  console.table(evts);
}

// 4) Any charges?
const [charges] = await db.query(
  `SELECT id, userId, provider, amountCents, status, sipayTransactionId, sipayOrder, sipayMaskedCard, createdAt
   FROM charges WHERE userId = ? OR sipayTransactionId = ? ORDER BY createdAt DESC LIMIT 10`,
  [userId, sipayTxId],
);
console.log(`\nCHARGES related (${charges.length} rows):`);
if (charges.length === 0) {
  console.log("  ⚠️  NONE — we never recorded this charge in the ledger.");
} else {
  console.table(charges);
}

// Decision tree
console.log("\n=== DIAGNOSIS ===");
const hasSub = subs.some((s) => s.status === "trialing" || s.status === "active");
if (hasSub) {
  console.log("✅ User HAS an active/trialing subscription. No action needed — Sipay charge is reconciled.");
  await db.end();
  process.exit(0);
}

console.log("❌ ORPHAN CHARGE: Sipay has the money, our DB has no subscription.");
console.log("   Customer paid but cannot use the service.");

if (!FIX) {
  console.log("\nRun with --fix to create the missing subscription manually.");
  await db.end();
  process.exit(0);
}

// 5) FIX: create the subscription
console.log("\n=== FIX MODE ===");
const now = new Date();
const periodEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2-day trial
const order = `sipay-${userId}-recovered-${Date.now()}`;

const [insertRes] = await db.query(
  `INSERT INTO subscriptions (
     userId, plan, status,
     sipayProvider, sipayOrder, sipayTransactionId, sipayMaskedCard,
     currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
     createdAt, updatedAt
   ) VALUES (?, 'trial', 'trialing', 'fastpay', ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
  [userId, order, sipayTxId, "manual-recovery", now, periodEnd],
);
console.log(`✅ Subscription created with id=${insertRes.insertId}, trial until ${periodEnd.toISOString()}`);

// Also stamp documents as paid
const [docRes] = await db.query(
  `UPDATE documents SET paymentStatus = 'paid' WHERE userId = ? AND paymentStatus != 'paid'`,
  [userId],
);
console.log(`✅ Marked ${docRes.affectedRows} document(s) as paid for user ${userId}`);

// Record the charge in the ledger
const [chargeRes] = await db.query(
  `INSERT INTO charges (
     userId, provider, amountCents, currency,
     sipayTransactionId, sipayOrder, sipayMaskedCard,
     status, createdAt
   ) VALUES (?, 'fastpay', 50, 'EUR', ?, ?, '', 'ok', NOW())`,
  [userId, sipayTxId, order],
);
console.log(`✅ Charge ledger row created with id=${chargeRes.insertId}`);

console.log("\n=== POST-FIX STATE ===");
const [after] = await db.query(
  `SELECT id, plan, status, currentPeriodStart, currentPeriodEnd, sipayProvider, sipayTransactionId
   FROM subscriptions WHERE userId = ?`,
  [userId],
);
console.table(after);

await db.end();
console.log("\nDone. The customer can now use the service.");

// Read-only diagnostic to confirm whether the dunning data really is empty
// or whether inspect-past-due.mjs is filtering out rows that exist under
// different status / provider / date values.
//
// Run with:  railway run node scripts/inspect-status-distribution.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString().slice(0, 19).replace("T", " ");

console.log(`\n=== Status distribution audit at ${now.toISOString()} ===\n`);

// ── 1) subscriptions GROUP BY status ───────────────────────────────────────
const [subStatuses] = await db.query(`
  SELECT status, COUNT(*) AS n
  FROM subscriptions
  GROUP BY status
  ORDER BY n DESC
`);
console.log("1) subscriptions grouped by status:");
console.table(subStatuses);

// Same split but separated into Sipay vs legacy Stripe
const [subStatusesSplit] = await db.query(`
  SELECT
    status,
    SUM(CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN 1 ELSE 0 END) AS sipay,
    SUM(CASE WHEN sipayToken IS NULL OR sipayToken = '' THEN 1 ELSE 0 END) AS legacy_stripe
  FROM subscriptions
  GROUP BY status
  ORDER BY status
`);
console.log("\n   subscriptions by status, split sipay vs legacy stripe:");
console.table(subStatusesSplit);

// ── 2) charges GROUP BY status this month ──────────────────────────────────
const [chargeStatusMonth] = await db.query(
  `
  SELECT status, provider, COUNT(*) AS n
  FROM charges
  WHERE createdAt >= ?
  GROUP BY status, provider
  ORDER BY n DESC
  `,
  [startOfMonth],
);
console.log(`\n2) charges grouped by (status, provider) since ${startOfMonth}:`);
if (chargeStatusMonth.length === 0) {
  console.log("   (no charges this month at all)");
} else {
  console.table(chargeStatusMonth);
}

// Same but ALL TIME, in case the column is populated but createdAt is wrong
const [chargeStatusAll] = await db.query(`
  SELECT status, provider, COUNT(*) AS n
  FROM charges
  GROUP BY status, provider
  ORDER BY n DESC
`);
console.log("\n   charges grouped by (status, provider) — ALL TIME (no date filter):");
if (chargeStatusAll.length === 0) {
  console.log("   (charges table is empty entirely)");
} else {
  console.table(chargeStatusAll);
}

// ── 3) 5 most recent charges with raw date values ──────────────────────────
const [recentCharges] = await db.query(`
  SELECT id, userId, provider, status, amountCents, createdAt,
         sipayTransactionId, sipayOrder, LEFT(COALESCE(errorDetail, ''), 80) AS errorDetail
  FROM charges
  ORDER BY id DESC
  LIMIT 5
`);
console.log("\n3) 5 most recent charges (raw rows):");
if (recentCharges.length === 0) {
  console.log("   (no rows at all)");
} else {
  console.table(recentCharges);
}

// Also: smallest + largest createdAt to confirm date column is sane
const [chargeDateRange] = await db.query(`
  SELECT
    COUNT(*) AS total_rows,
    MIN(createdAt) AS oldest_charge,
    MAX(createdAt) AS newest_charge
  FROM charges
`);
console.log("\n   charges createdAt range:");
console.table(chargeDateRange);

// ── 4) what the failure branch of the cron writes ──────────────────────────
console.log(`
4) After a failed MIT charge, the cron currently writes:
   - subscriptions.status     = 'past_due'
   - subscriptions.currentPeriodEnd = (kept at whatever it was, or NOW() if null)
   - charges row with        status='failed', provider='mit', errorDetail = sipay payload detail

   Source: server/_core/index.ts:988-1012 (after the [MIT-DUNNING-RAW] log just added).

   THE BUG: because currentPeriodEnd is NOT moved forward on failure,
   the getSubsDueForRenewal selector picks the same sub again next cron run
   (it returns subs where currentPeriodEnd <= NOW() and status IN
   ('trialing','active','past_due') and cancelAtPeriodEnd = false).
   That is the "every day" retry behavior we need to replace.

   The selector lives in server/db.ts:822 (getSubsDueForRenewal).
`);

// ── 5) webhook_events sanity check ─────────────────────────────────────────
// In case MIT runs DID happen but recordCharge silently failed, the cron also
// writes mit_charge_failed / mit_charge_ok events to webhook_events. If those
// are zero, the cron has never actually executed in production.
const [mitEvents] = await db.query(
  `
  SELECT eventType, status, COUNT(*) AS n
  FROM webhook_events
  WHERE eventType LIKE 'mit_%'
  GROUP BY eventType, status
  ORDER BY n DESC
  `,
);
console.log("5) webhook_events with eventType starting 'mit_*' (would prove cron ran):");
if (mitEvents.length === 0) {
  console.log("   (zero — confirms the MIT cron has NEVER fired in production yet)");
} else {
  console.table(mitEvents);
}

// 24 denials reported by Comercia (May-June) almost certainly came from the
// Stripe-billed legacy subs, not our cron. We can cross-check by looking at
// any sub-rows that have a status='past_due' regardless of provider.
console.log("\nDone.\n");

await db.end();

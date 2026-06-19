// Read-only audit of the 257 legacy Stripe-era subscriptions still marked
// as active. Answers:
//   1) which identifier fields are populated on those rows
//   2) how many have a sipayToken (= chargeable via MIT-R) vs none
//   3) how many have currentPeriodEnd already in the past (overdue)
//
// Run with:  railway run node scripts/inspect-stripe-legacy.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log(`\n=== Legacy Stripe subscription audit at ${new Date().toISOString()} ===\n`);

// ── 1) ID-field population across ALL subs ────────────────────────────────
const [populationAll] = await db.query(`
  SELECT
    status,
    COUNT(*) AS total,
    SUM(CASE WHEN stripeCustomerId IS NOT NULL AND stripeCustomerId <> '' THEN 1 ELSE 0 END) AS has_stripe_customer,
    SUM(CASE WHEN stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '' THEN 1 ELSE 0 END) AS has_stripe_sub,
    SUM(CASE WHEN stripeSessionId IS NOT NULL AND stripeSessionId <> '' THEN 1 ELSE 0 END) AS has_stripe_session,
    SUM(CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN 1 ELSE 0 END) AS has_sipay_token,
    SUM(CASE WHEN sipayTransactionId IS NOT NULL AND sipayTransactionId <> '' THEN 1 ELSE 0 END) AS has_sipay_txn
  FROM subscriptions
  GROUP BY status
  ORDER BY total DESC
`);
console.log("1a) ID-field population per status:");
console.table(populationAll);

// Same but just the active set (the 257)
const [populationActive] = await db.query(`
  SELECT
    'active subs only' AS scope,
    COUNT(*) AS total,
    SUM(CASE WHEN stripeCustomerId IS NOT NULL AND stripeCustomerId <> '' THEN 1 ELSE 0 END) AS has_stripe_customer,
    SUM(CASE WHEN stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '' THEN 1 ELSE 0 END) AS has_stripe_sub,
    SUM(CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN 1 ELSE 0 END) AS has_sipay_token
  FROM subscriptions
  WHERE status = 'active'
`);
console.log("\n1b) Field population, status='active' only (the 257):");
console.table(populationActive);

// Cross-tab: are there ANY rows that have BOTH a stripe id AND a sipay token?
// (= old Stripe sub that the user re-onboarded through Sipay — important
//  edge case)
const [hybrid] = await db.query(`
  SELECT
    SUM(CASE WHEN stripeCustomerId IS NOT NULL AND sipayToken IS NOT NULL THEN 1 ELSE 0 END) AS both_stripe_and_sipay,
    SUM(CASE WHEN stripeCustomerId IS NOT NULL AND (sipayToken IS NULL OR sipayToken = '') THEN 1 ELSE 0 END) AS stripe_only,
    SUM(CASE WHEN (stripeCustomerId IS NULL OR stripeCustomerId = '') AND sipayToken IS NOT NULL THEN 1 ELSE 0 END) AS sipay_only,
    SUM(CASE WHEN (stripeCustomerId IS NULL OR stripeCustomerId = '') AND (sipayToken IS NULL OR sipayToken = '') THEN 1 ELSE 0 END) AS neither
  FROM subscriptions
`);
console.log("\n1c) Stripe vs Sipay token coverage (ALL subs):");
console.table(hybrid);

// ── 2) Sipay-tokenized cards among active Stripe subs ─────────────────────
// If has_sipay_token = 0 for the 257 actives, we have NO way to bill them
// via Sipay without asking them to re-enter their card.
console.log(`
2) Whether legacy active subs can be billed via Sipay:
   See 1b above. If 'has_sipay_token' is 0, none of the 257 can be charged
   via the MIT-R cron — their card tokens only existed in Stripe's vault
   and Stripe will never give us those PANs (PCI rules).

   The only legitimate way to recover them is to email each user and ask
   them to re-onboard via /dashboard?tab=billing, which under the current
   PaywallModal flow will tokenize a fresh Sipay card for them.
`);

// ── 3) Overdue active subs (currentPeriodEnd in the past) ─────────────────
const [overdueBuckets] = await db.query(`
  SELECT
    CASE
      WHEN currentPeriodEnd IS NULL                                      THEN 'NULL period_end'
      WHEN currentPeriodEnd > NOW()                                      THEN 'in future (healthy)'
      WHEN currentPeriodEnd > DATE_SUB(NOW(), INTERVAL 1 DAY)            THEN 'overdue <1d'
      WHEN currentPeriodEnd > DATE_SUB(NOW(), INTERVAL 7 DAY)            THEN 'overdue 1-7d'
      WHEN currentPeriodEnd > DATE_SUB(NOW(), INTERVAL 30 DAY)           THEN 'overdue 7-30d'
      WHEN currentPeriodEnd > DATE_SUB(NOW(), INTERVAL 90 DAY)           THEN 'overdue 30-90d'
      ELSE 'overdue >90d'
    END AS bucket,
    COUNT(*) AS n
  FROM subscriptions
  WHERE status = 'active'
  GROUP BY bucket
  ORDER BY FIELD(bucket,
    'in future (healthy)',
    'overdue <1d', 'overdue 1-7d', 'overdue 7-30d', 'overdue 30-90d',
    'overdue >90d', 'NULL period_end'
  )
`);
console.log("3) Active subs by currentPeriodEnd freshness:");
console.table(overdueBuckets);

// Total overdue
const [overdueTotal] = await db.query(`
  SELECT COUNT(*) AS overdue_active_subs
  FROM subscriptions
  WHERE status = 'active'
    AND currentPeriodEnd IS NOT NULL
    AND currentPeriodEnd <= NOW()
`);
console.log("\n   Total active subs already overdue:");
console.table(overdueTotal);

// ── 4) For context: when were these active subs originally created? ───────
const [ageBuckets] = await db.query(`
  SELECT
    CASE
      WHEN createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)   THEN '<7d old'
      WHEN createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY)  THEN '7-30d old'
      WHEN createdAt > DATE_SUB(NOW(), INTERVAL 90 DAY)  THEN '30-90d old'
      WHEN createdAt > DATE_SUB(NOW(), INTERVAL 180 DAY) THEN '90-180d old'
      ELSE '>180d old'
    END AS age_bucket,
    COUNT(*) AS n
  FROM subscriptions
  WHERE status = 'active'
  GROUP BY age_bucket
  ORDER BY FIELD(age_bucket, '<7d old', '7-30d old', '30-90d old', '90-180d old', '>180d old')
`);
console.log("4) Active subs by creation age (for context):");
console.table(ageBuckets);

// Newest 5 + oldest 5 active subs to eyeball the data
const [newest] = await db.query(`
  SELECT id, userId, plan, createdAt, currentPeriodEnd,
         CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN '✓' ELSE '' END AS has_sipay,
         CASE WHEN stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '' THEN '✓' ELSE '' END AS has_stripe
  FROM subscriptions
  WHERE status = 'active'
  ORDER BY createdAt DESC
  LIMIT 5
`);
console.log("\n   Newest 5 active subs:");
console.table(newest);

const [oldest] = await db.query(`
  SELECT id, userId, plan, createdAt, currentPeriodEnd,
         CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN '✓' ELSE '' END AS has_sipay,
         CASE WHEN stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '' THEN '✓' ELSE '' END AS has_stripe
  FROM subscriptions
  WHERE status = 'active'
  ORDER BY createdAt ASC
  LIMIT 5
`);
console.log("\n   Oldest 5 active subs:");
console.table(oldest);

await db.end();
console.log("\nDone.\n");

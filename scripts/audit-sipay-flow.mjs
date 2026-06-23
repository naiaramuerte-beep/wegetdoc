/**
 * Audit the live Sipay flow against the DB so we can spot brokenness
 * before customers do.
 *
 * Checks:
 *   1. Recent subs and whether they have a sipayToken (the field MIT-R reads).
 *   2. Subs about to renew in the next 24h (cron is daily).
 *   3. Charges in the last 7d, broken down by provider + status.
 *   4. Past-due subs that might be stuck.
 *   5. Webhook events with status=error in the last 24h.
 *
 * Run with:  railway run node scripts/audit-sipay-flow.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

function rule(title) {
  console.log("\n" + "─".repeat(72));
  console.log(title);
  console.log("─".repeat(72));
}

try {
  rule("1. Subs in last 7 days (token presence is critical)");
  const [recentSubs] = await db.execute(`
    SELECT id, userId, plan, status, sipayProvider,
           CASE WHEN sipayToken IS NULL OR sipayToken = '' THEN '✗ MISSING' ELSE '✓ has' END as tokenState,
           sipayMaskedCard, currentPeriodEnd, createdAt
    FROM subscriptions
    WHERE createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
       OR updatedAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY createdAt DESC
    LIMIT 30
  `);
  console.table(recentSubs);

  const noToken = recentSubs.filter(r => r.tokenState.includes("MISSING"));
  if (noToken.length > 0) {
    console.log(`\n⚠️  ${noToken.length} of ${recentSubs.length} recent subs have NO sipayToken — MIT-R can NEVER renew these.`);
  } else {
    console.log(`✓ All ${recentSubs.length} recent subs have a sipayToken.`);
  }

  rule("2. Subs due for renewal in next 48h (cron will touch these)");
  const [dueSoon] = await db.execute(`
    SELECT id, userId, plan, status, sipayProvider,
           sipayMaskedCard, currentPeriodEnd,
           cancelAtPeriodEnd,
           TIMESTAMPDIFF(HOUR, NOW(), currentPeriodEnd) as hoursUntilRenew
    FROM subscriptions
    WHERE currentPeriodEnd <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
      AND sipayToken IS NOT NULL AND sipayToken <> ''
      AND cancelAtPeriodEnd = false
      AND status IN ('trialing', 'active', 'past_due')
    ORDER BY currentPeriodEnd ASC
    LIMIT 30
  `);
  console.table(dueSoon);
  console.log(`Total due for renewal: ${dueSoon.length}`);

  rule("3. Charges in last 7 days (provider × status breakdown)");
  const [chargeAgg] = await db.execute(`
    SELECT provider, status, COUNT(*) as count, SUM(amountCents) / 100 as eurTotal
    FROM charges
    WHERE createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY provider, status
    ORDER BY provider, status
  `);
  console.table(chargeAgg);

  rule("4. Past-due subs (renewal failed, customer needs attention)");
  const [pastDue] = await db.execute(`
    SELECT userId, plan, sipayProvider, sipayMaskedCard, currentPeriodEnd,
           DATEDIFF(NOW(), currentPeriodEnd) as daysOverdue
    FROM subscriptions
    WHERE status = 'past_due'
      AND sipayToken IS NOT NULL AND sipayToken <> ''
    ORDER BY currentPeriodEnd DESC
    LIMIT 20
  `);
  console.table(pastDue);
  console.log(`Past-due count: ${pastDue.length}`);

  rule("5. Webhook events with errors in last 24h");
  // webhook_events stamps the time as `receivedAt`, not `createdAt`.
  const [errs] = await db.execute(`
    SELECT eventType, COUNT(*) as count,
           MAX(receivedAt) as lastSeen,
           SUBSTRING(MAX(errorMessage), 1, 120) as sampleError
    FROM webhook_events
    WHERE status = 'error'
      AND receivedAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY eventType
    ORDER BY count DESC
    LIMIT 20
  `);
  console.table(errs);

  rule("6. Health: subs with sipayProvider='fastpay' but missing token");
  const [orphans] = await db.execute(`
    SELECT id, userId, status, plan, sipayProvider, sipayMaskedCard, createdAt
    FROM subscriptions
    WHERE sipayProvider IS NOT NULL
      AND (sipayToken IS NULL OR sipayToken = '')
    ORDER BY createdAt DESC
    LIMIT 10
  `);
  console.table(orphans);
  if (orphans.length > 0) {
    console.log(`\n⚠️  ${orphans.length} subs have a sipayProvider set but NO sipayToken. These will never renew.`);
  }

  rule("Summary");
  console.log(`Recent subs (7d): ${recentSubs.length}`);
  console.log(`Subs due in 48h: ${dueSoon.length}`);
  console.log(`Past-due now:    ${pastDue.length}`);
  console.log(`Subs w/o token:  ${noToken.length}`);
  console.log(`Webhook errors (24h types): ${errs.length}`);
} catch (err) {
  console.error("❌ Audit error:", err);
} finally {
  await db.end();
}

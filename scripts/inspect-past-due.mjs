// Read-only audit of subscriptions currently in past_due + how many failed
// MIT charges each one has accumulated this calendar month. Used as input
// to the dunning backfill decision: subs with many failures this month
// likely shouldn't enter the new retry schedule — they should be flipped
// straight to payment_failed.
//
// Run with:  railway run node scripts/inspect-past-due.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString().slice(0, 19).replace("T", " ");

console.log(`\n=== Inspection at ${now.toISOString()} ===`);
console.log(`Counting failed charges since: ${startOfMonth}\n`);

// ── 1) High-level counts ───────────────────────────────────────────────────
const [overall] = await db.query(`
  SELECT
    COUNT(*) AS total_past_due,
    SUM(CASE WHEN sipayToken IS NOT NULL AND sipayToken <> '' THEN 1 ELSE 0 END) AS past_due_with_sipay_token,
    SUM(CASE WHEN sipayToken IS NULL OR sipayToken = '' THEN 1 ELSE 0 END) AS past_due_legacy_stripe
  FROM subscriptions
  WHERE status = 'past_due'
`);
console.log("Subscriptions in past_due:");
console.table(overall);

// ── 2) Per-sub failure history this month ──────────────────────────────────
const [perSub] = await db.query(
  `
  SELECT
    s.id            AS sub_id,
    s.userId        AS user_id,
    u.email         AS email,
    s.plan          AS plan,
    s.currentPeriodEnd        AS current_period_end,
    s.cancelAtPeriodEnd       AS cancel_at_period_end,
    s.sipayMaskedCard         AS masked_card,
    s.sipayProvider           AS provider,
    COUNT(c.id)               AS failed_charges_this_month,
    MIN(c.createdAt)          AS first_failure_this_month,
    MAX(c.createdAt)          AS last_failure_this_month,
    GROUP_CONCAT(DISTINCT LEFT(COALESCE(c.errorDetail, ''), 80) SEPARATOR ' | ') AS distinct_error_details
  FROM subscriptions s
  LEFT JOIN users u    ON u.id = s.userId
  LEFT JOIN charges c  ON c.userId = s.userId
                       AND c.status = 'failed'
                       AND c.provider = 'mit'
                       AND c.createdAt >= ?
  WHERE s.status = 'past_due'
    AND s.sipayToken IS NOT NULL AND s.sipayToken <> ''
  GROUP BY s.id, s.userId, u.email, s.plan, s.currentPeriodEnd,
           s.cancelAtPeriodEnd, s.sipayMaskedCard, s.sipayProvider
  ORDER BY failed_charges_this_month DESC, s.currentPeriodEnd ASC
  `,
  [startOfMonth],
);

console.log(`\nPer-subscription past-due breakdown (only Sipay subs, ${perSub.length} rows):`);
if (perSub.length === 0) {
  console.log("  (none)");
} else {
  console.table(
    perSub.map((r) => ({
      sub_id: r.sub_id,
      email: r.email ?? "—",
      plan: r.plan,
      period_end: r.current_period_end?.toISOString?.().slice(0, 10) ?? "—",
      cancel_at_end: r.cancel_at_period_end ? "✓" : "",
      card: r.masked_card ?? "—",
      provider: r.provider ?? "—",
      fails_this_month: Number(r.failed_charges_this_month),
      first_fail: r.first_failure_this_month?.toISOString?.().slice(0, 16).replace("T", " ") ?? "—",
      last_fail: r.last_failure_this_month?.toISOString?.().slice(0, 16).replace("T", " ") ?? "—",
    })),
  );
}

// ── 3) Histogram of failure counts ─────────────────────────────────────────
const buckets = { "0": 0, "1": 0, "2-3": 0, "4-7": 0, "8-15": 0, "16+": 0 };
for (const r of perSub) {
  const n = Number(r.failed_charges_this_month);
  if (n === 0) buckets["0"] += 1;
  else if (n === 1) buckets["1"] += 1;
  else if (n <= 3) buckets["2-3"] += 1;
  else if (n <= 7) buckets["4-7"] += 1;
  else if (n <= 15) buckets["8-15"] += 1;
  else buckets["16+"] += 1;
}
console.log("\nHistogram of failed-charges-this-month per past-due sub:");
console.table(buckets);

// ── 4) Distinct error details seen this month (for code-mapping prep) ──────
const [distinctErrors] = await db.query(
  `
  SELECT
    LEFT(COALESCE(errorDetail, ''), 200) AS error_detail,
    COUNT(*) AS occurrences
  FROM charges
  WHERE status = 'failed'
    AND provider = 'mit'
    AND createdAt >= ?
  GROUP BY error_detail
  ORDER BY occurrences DESC
  LIMIT 30
  `,
  [startOfMonth],
);
console.log("\nDistinct MIT failure errorDetail strings this month (top 30):");
console.table(distinctErrors);

await db.end();
console.log("\nDone.\n");

/**
 * Sync local subscriptions table with the real state in Stripe.
 * For each sub flagged plan='trial' locally, fetch from Stripe and if Stripe
 * says the sub is out of trial (status=active and no trial_end in the future),
 * update the local row to plan='monthly'.
 *
 * Usage: railway run node scripts/backfill-sub-status.mjs [--dry]
 */
import Stripe from "stripe";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DRY = process.argv.includes("--dry");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = await mysql.createConnection(process.env.DATABASE_URL);

const [localSubs] = await db.execute(
  "SELECT id, userId, stripeSubscriptionId, plan, status, currentPeriodEnd FROM subscriptions WHERE plan IN ('trial', 'monthly') AND status IN ('active', 'trialing', 'past_due')"
);
console.log(`Checking ${localSubs.length} live subs against Stripe…\n`);

let updates = 0, errors = 0, skipped = 0;
const nowTs = Math.floor(Date.now() / 1000);

for (const local of localSubs) {
  if (!local.stripeSubscriptionId) { skipped++; continue; }
  try {
    const remote = await stripe.subscriptions.retrieve(local.stripeSubscriptionId);
    const inTrial = remote.trial_end && remote.trial_end > nowTs;
    const stripePlan = inTrial ? "trial" : "monthly";
    const stripeStatus = remote.status === "trialing" ? "trialing"
      : remote.status === "active" ? "active"
      : remote.status === "past_due" ? "past_due"
      : remote.status === "canceled" ? "canceled"
      : "incomplete";

    const needsUpdate = local.plan !== stripePlan || local.status !== stripeStatus;
    const mark = needsUpdate ? "🔧" : "✓ ";
    console.log(`${mark} sub ${local.stripeSubscriptionId.slice(0, 20)}…  local=${local.plan}/${local.status} → stripe=${stripePlan}/${stripeStatus}${inTrial ? ` (trial ends ${new Date(remote.trial_end * 1000).toISOString().slice(0, 16)})` : ""}`);

    if (needsUpdate && !DRY) {
      // current_period_end can be null/0 for incomplete or trialing subs that
      // haven't been billed yet. Only update the date if we got a valid one.
      const periodEnd = remote.current_period_end
        ? new Date(remote.current_period_end * 1000)
        : (remote.trial_end ? new Date(remote.trial_end * 1000) : null);
      if (periodEnd) {
        await db.execute(
          "UPDATE subscriptions SET plan = ?, status = ?, currentPeriodEnd = ?, cancelAtPeriodEnd = ? WHERE id = ?",
          [stripePlan, stripeStatus, periodEnd, remote.cancel_at_period_end ? 1 : 0, local.id]
        );
      } else {
        await db.execute(
          "UPDATE subscriptions SET plan = ?, status = ?, cancelAtPeriodEnd = ? WHERE id = ?",
          [stripePlan, stripeStatus, remote.cancel_at_period_end ? 1 : 0, local.id]
        );
      }
      updates++;
    } else if (needsUpdate && DRY) {
      updates++;
    }
  } catch (err) {
    errors++;
    console.log(`❌ sub ${local.stripeSubscriptionId?.slice(0, 20)}…  error: ${err.message}`);
  }
}

console.log(`\n${DRY ? "[DRY] Would update" : "Updated"}: ${updates}`);
console.log(`Errors: ${errors}`);
console.log(`Skipped (no stripe id): ${skipped}`);

await db.end();

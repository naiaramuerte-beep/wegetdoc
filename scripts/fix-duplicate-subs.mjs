/**
 * Remediate customers with duplicate active subs:
 * 1. Keep the NEWER sub (longest remaining trial → better for the user)
 * 2. Cancel the OLDER duplicate sub in Stripe
 * 3. Refund the €0.50 PaymentIntent attached to the older sub
 *
 * Usage:
 *   railway run node scripts/fix-duplicate-subs.mjs         # dry run
 *   railway run node scripts/fix-duplicate-subs.mjs --apply # actually run
 */
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const APPLY = process.argv.includes("--apply");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log(APPLY ? "⚠️  APPLY MODE — making real changes" : "🔍 DRY RUN — no changes will be made\n");

// Scan for duplicates
const all = [];
let starting_after;
while (true) {
  const page = await stripe.subscriptions.list({ status: "all", limit: 100, starting_after });
  all.push(...page.data.filter(s => ["active", "trialing", "past_due"].includes(s.status)));
  if (!page.has_more) break;
  starting_after = page.data[page.data.length - 1].id;
}

const byCustomer = new Map();
for (const s of all) {
  const cid = typeof s.customer === "string" ? s.customer : s.customer.id;
  if (!byCustomer.has(cid)) byCustomer.set(cid, []);
  byCustomer.get(cid).push(s);
}

const duplicates = [...byCustomer.entries()].filter(([, subs]) => subs.length > 1);
console.log(`Found ${duplicates.length} customers with duplicate subs\n`);

let totalRefundedCents = 0;
for (const [cid, subs] of duplicates) {
  const customer = await stripe.customers.retrieve(cid);
  subs.sort((a, b) => a.created - b.created);
  const older = subs[0];
  const newer = subs[subs.length - 1];

  console.log(`Customer: ${customer.email}`);
  console.log(`  Keep:   ${newer.id}  (created ${new Date(newer.created * 1000).toISOString()})`);
  console.log(`  Cancel: ${older.id}  (created ${new Date(older.created * 1000).toISOString()})`);

  // Pull ALL PaymentIntents for this customer, then find the €0.50 charge
  // closest in time to the OLDER sub's creation. The PaymentIntent for the
  // €0.50 intro fires a few seconds BEFORE the subscription is created (the
  // client pays, then confirmSetup creates the sub), so we check a wider
  // window on both sides and pick the best match.
  const allPIs = [];
  let paging;
  for (let i = 0; i < 3; i++) {
    const p = await stripe.paymentIntents.list({ customer: cid, limit: 100, starting_after: paging });
    allPIs.push(...p.data);
    if (!p.has_more) break;
    paging = p.data[p.data.length - 1].id;
  }
  const candidates = allPIs
    .filter(pi => pi.status === "succeeded" && pi.amount === 50)
    .map(pi => ({ pi, delta: Math.abs(pi.created - older.created) }))
    .sort((a, b) => a.delta - b.delta);
  const successfulIntro = candidates[0]?.pi;
  if (!successfulIntro) {
    console.log(`  ⚠️  No €0.50 PaymentIntent found for customer — skip refund`);
  } else {
    console.log(`  Refund: ${successfulIntro.id}  (€${successfulIntro.amount / 100}, Δt=${candidates[0].delta}s from older sub)`);
  }

  if (APPLY) {
    try {
      await stripe.subscriptions.cancel(older.id, { prorate: false });
      console.log(`  ✓ Canceled ${older.id}`);
    } catch (err) {
      console.log(`  ✗ Cancel failed: ${err.message}`);
    }
    if (successfulIntro && successfulIntro.latest_charge) {
      try {
        const refund = await stripe.refunds.create({
          charge: successfulIntro.latest_charge,
          reason: "duplicate",
        });
        totalRefundedCents += refund.amount;
        console.log(`  ✓ Refunded €${refund.amount / 100} (${refund.id})`);
      } catch (err) {
        console.log(`  ✗ Refund failed: ${err.message}`);
      }
    }
  }
  console.log("");
}

console.log(`${APPLY ? "Applied" : "Would apply"}: cancel ${duplicates.length} orphan sub(s), refund up to €${(duplicates.length * 0.5).toFixed(2)}`);
if (APPLY) console.log(`Actually refunded: €${(totalRefundedCents / 100).toFixed(2)}`);

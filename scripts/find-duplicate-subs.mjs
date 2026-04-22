/**
 * Scan Stripe for customers that have more than 1 active/trialing sub —
 * these are victims of a duplicate-signup bug (no idempotency in confirmSetup).
 * Read-only: just reports.
 */
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("Scanning all active+trialing subs…");
const all = [];
let starting_after;
while (true) {
  const page = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    starting_after,
  });
  all.push(...page.data.filter(s => ["active", "trialing", "past_due"].includes(s.status)));
  if (!page.has_more) break;
  starting_after = page.data[page.data.length - 1].id;
}

console.log(`Total live subs: ${all.length}`);

// Group by customer
const byCustomer = new Map();
for (const s of all) {
  const cid = typeof s.customer === "string" ? s.customer : s.customer.id;
  if (!byCustomer.has(cid)) byCustomer.set(cid, []);
  byCustomer.get(cid).push(s);
}

const duplicates = [...byCustomer.entries()].filter(([, subs]) => subs.length > 1);
console.log(`\nCustomers with multiple live subs: ${duplicates.length}`);
console.log(duplicates.length ? "─".repeat(100) : "");

for (const [cid, subs] of duplicates) {
  const customer = await stripe.customers.retrieve(cid);
  console.log(`\nCustomer: ${customer.email} (${cid})`);
  for (const s of subs) {
    console.log(`  - ${s.id}  status=${s.status}  created=${new Date(s.created * 1000).toISOString()}  trial_end=${s.trial_end ? new Date(s.trial_end * 1000).toISOString() : "—"}`);
  }
}

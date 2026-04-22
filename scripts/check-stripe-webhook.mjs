/**
 * Inspect Stripe webhook configuration + recent delivery status.
 * Usage: railway run node scripts/check-stripe-webhook.mjs
 */
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.STRIPE_SECRET_KEY;
const expectedSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!key) { console.error("STRIPE_SECRET_KEY not set"); process.exit(1); }

const stripe = new Stripe(key);

console.log("─── Webhook endpoints registered in Stripe ───");
const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
for (const ep of endpoints.data) {
  console.log(`• ${ep.id}`);
  console.log(`  URL:     ${ep.url}`);
  console.log(`  Status:  ${ep.status}`);
  console.log(`  Events:  ${ep.enabled_events.slice(0, 10).join(", ")}${ep.enabled_events.length > 10 ? `, +${ep.enabled_events.length - 10} more` : ""}`);
  console.log(`  Created: ${new Date(ep.created * 1000).toISOString()}`);
  console.log("");
}

console.log("─── STRIPE_WEBHOOK_SECRET check ───");
console.log("Configured in env:", expectedSecret ? `${expectedSecret.slice(0, 10)}… (length: ${expectedSecret.length})` : "❌ NOT SET");

console.log("\n─── Last 30 events of interest (subscription/invoice) ───");
const interestingTypes = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "checkout.session.completed",
]);

const events = await stripe.events.list({ limit: 100 });
const filtered = events.data.filter(e => interestingTypes.has(e.type));
for (const ev of filtered.slice(0, 30)) {
  const when = new Date(ev.created * 1000).toISOString();
  console.log(`${when}  ${ev.type.padEnd(40)}  ${ev.id}`);
}

console.log(`\nShowing ${Math.min(30, filtered.length)} of ${filtered.length} relevant events in the last 100 events.`);

/**
 * Add missing events to the Stripe webhook endpoint so trial→monthly
 * transitions fire properly.
 * Usage: railway run node scripts/fix-stripe-webhook-events.mjs
 */
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("STRIPE_SECRET_KEY not set"); process.exit(1); }

const stripe = new Stripe(key);
const WEBHOOK_URL = "https://editorpdf.net/api/stripe/webhook";
const TARGET_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
].sort();

const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
const target = endpoints.data.find(e => e.url === WEBHOOK_URL);
if (!target) {
  console.error(`No webhook endpoint found for ${WEBHOOK_URL}`);
  process.exit(1);
}

console.log("Current endpoint:", target.id);
console.log("Before:", target.enabled_events.sort().join(", "));
console.log("After: ", TARGET_EVENTS.join(", "));

const updated = await stripe.webhookEndpoints.update(target.id, {
  enabled_events: TARGET_EVENTS,
});

console.log("\n✅ Updated:", updated.id);
console.log("Events now:", updated.enabled_events.sort().join(", "));

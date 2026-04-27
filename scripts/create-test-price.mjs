/**
 * Create a recurring monthly Price in Stripe for the A/B price test (€39,90/mo).
 *
 * Usage:
 *   - Local:    `node scripts/create-test-price.mjs`  (reads .env)
 *   - Railway:  `railway run node scripts/create-test-price.mjs`
 *
 * Output: prints the new `price_xxx` ID. Copy it into the Admin panel
 * (Ajustes → "Precio de suscripción" → Stripe Price ID) to start charging
 * new checkouts at €39,90 instead of the env-default STRIPE_PRICE_ID.
 *
 * Existing subs at €19,99 are NOT migrated.
 */
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY not set in env");
  process.exit(1);
}

const AMOUNT_EUR = 39.90;
const NICKNAME = "EditorPDF Monthly (€39,90 A/B test)";

const stripe = new Stripe(key);

// Reuse a single recurring Product so all monthly prices belong together.
const PRODUCT_NAME = "EditorPDF Monthly";

console.log("─── Looking for existing 'EditorPDF Monthly' product ───");
const products = await stripe.products.list({ limit: 100, active: true });
let product = products.data.find((p) => p.name === PRODUCT_NAME);
if (!product) {
  product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: "Suscripción mensual EditorPDF (test de precio)",
  });
  console.log(`  Created product: ${product.id}`);
} else {
  console.log(`  Reusing product: ${product.id}`);
}

console.log("\n─── Creating Price ───");
const price = await stripe.prices.create({
  product: product.id,
  currency: "eur",
  unit_amount: Math.round(AMOUNT_EUR * 100),
  recurring: { interval: "month" },
  nickname: NICKNAME,
  metadata: {
    label: "monthly-3990",
    purpose: "ab-test",
  },
});

console.log("\n✅ New Price created\n");
console.log(`  ID:        ${price.id}`);
console.log(`  Amount:    €${AMOUNT_EUR.toFixed(2)} / month`);
console.log(`  Product:   ${product.id} (${product.name})`);
console.log(`  Nickname:  ${NICKNAME}\n`);
console.log("Next: open the Admin panel → Ajustes → Precio de suscripción");
console.log(`and paste this ID into "Stripe Price ID": ${price.id}`);

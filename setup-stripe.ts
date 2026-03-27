/**
 * Stripe Setup Script for PDFUp
 * Creates products and prices for:
 * 1. Trial plan: 0.50€ one-time + auto-renews at 49.95€/month after 7 days
 * 2. Monthly plan: 49.95€/month recurring subscription
 */
import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("ERROR: STRIPE_SECRET_KEY not set");
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  console.log("Connected to Stripe. Creating products and prices...\n");

  // ── 1. Create main subscription product ──────────────────────────────────
  const mainProduct = await stripe.products.create({
    name: "PDFUp Premium",
    description: "Unlimited PDF editing, signing, converting, merging and compressing",
    metadata: {
      app: "pdfup",
    },
  });
  console.log("✓ Created product:", mainProduct.name, mainProduct.id);

  // ── 2. Create monthly recurring price (49.95€/month) ─────────────────────
  const monthlyPrice = await stripe.prices.create({
    product: mainProduct.id,
    unit_amount: 4995, // 49.95€ in cents
    currency: "eur",
    recurring: {
      interval: "month",
    },
    nickname: "Monthly - 49.95€",
    metadata: {
      plan: "monthly",
    },
  });
  console.log("✓ Created monthly price:", monthlyPrice.id, "49.95€/month");

  // ── 3. Create trial setup price (0.50€ one-time, then 49.95€/month) ──────
  // For the trial flow, we charge 0.50€ upfront and then subscribe to monthly
  const trialPrice = await stripe.prices.create({
    product: mainProduct.id,
    unit_amount: 50, // 0.50€ in cents
    currency: "eur",
    nickname: "Trial - 0.50€ (then 49.95€/month)",
    metadata: {
      plan: "trial",
    },
  });
  console.log("✓ Created trial price:", trialPrice.id, "0.50€ (trial)");

  // ── 4. Output the IDs to use in the app ──────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("STRIPE CONFIGURATION - Add to your environment:");
  console.log("═══════════════════════════════════════════════════");
  console.log(`STRIPE_PRODUCT_ID=${mainProduct.id}`);
  console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
  console.log(`STRIPE_TRIAL_PRICE_ID=${trialPrice.id}`);
  console.log("═══════════════════════════════════════════════════\n");

  // ── 5. Set the monthly price as the default price for the product ─────────
  await stripe.products.update(mainProduct.id, {
    default_price: monthlyPrice.id,
  });
  console.log("✓ Set monthly price as default for product");

  console.log("\nStripe setup complete!");
  return {
    productId: mainProduct.id,
    monthlyPriceId: monthlyPrice.id,
    trialPriceId: trialPrice.id,
  };
}

main().catch(console.error);

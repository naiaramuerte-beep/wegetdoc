/**
 * PDFUp — Stripe Products & Prices
 * Model: 0,50€ activation fee + 7-day trial → 49,90€/month subscription after 7 days
 * Stripe charges 0,50€ immediately when the user subscribes.
 * After 7 days, the subscription renews automatically at 49,90€/month.
 *
 * Price IDs (live):
 *   Monthly 49,90€/mes: price_1TCdbn2WMuUgq7vD74v0mclA
 *   One-time activation 0,50€: price_1TCdcV2WMuUgq7vD5X99lzED
 */

export const STRIPE_PRICE_IDS = {
  /** Recurring monthly subscription: 49,90€/month */
  monthly: "price_1TCdbn2WMuUgq7vD74v0mclA",
  /** One-time activation fee: 0,50€ */
  activation: "price_1TCdcV2WMuUgq7vD5X99lzED",
} as const;

export const PLANS = {
  /** Trial: 0,50€ activation + 7-day trial, then 49,90€/month */
  trial: {
    id: "trial",
    name: "Acceso 7 días",
    description: "0,50€ hoy, luego 49,90€/mes. Cancela cuando quieras.",
    activationPrice: 0.50,
    monthlyPrice: 49.90,
    currency: "eur",
    interval: "month" as const,
    trialDays: 7,
    stripePriceId: STRIPE_PRICE_IDS.monthly,
    activationPriceId: STRIPE_PRICE_IDS.activation,
  },
  /** Direct monthly subscription without trial */
  monthly: {
    id: "monthly",
    name: "Plan Mensual",
    description: "Acceso ilimitado mensual",
    activationPrice: null,
    monthlyPrice: 49.90,
    currency: "eur",
    interval: "month" as const,
    trialDays: 0,
    stripePriceId: STRIPE_PRICE_IDS.monthly,
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * PDFPro — Stripe Products & Prices
 * Define all subscription plans here.
 */

export const PLANS = {
  trial: {
    id: "trial",
    name: "Prueba 7 días",
    description: "Acceso completo durante 7 días",
    price: 0.99,
    currency: "eur",
    interval: null as null,
    trialDays: 7,
    // Stripe price ID — set via environment variable or create in Stripe dashboard
    stripePriceId: process.env.STRIPE_PRICE_TRIAL || "",
  },
  monthly: {
    id: "monthly",
    name: "Plan Mensual",
    description: "Acceso ilimitado mensual",
    price: 9.99,
    currency: "eur",
    interval: "month" as const,
    trialDays: 0,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY || "",
  },
} as const;

export type PlanId = keyof typeof PLANS;

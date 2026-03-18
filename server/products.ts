/**
 * PDFPro — Stripe Products & Prices
 * Model: 7-day free trial (0€) → 49.95€/month subscription
 * Stripe collects card details upfront but charges 0€ today.
 * After the trial period, the subscription renews automatically.
 */

export const PLANS = {
  /** Free trial: 7 days at 0€, then 49.95€/month */
  trial: {
    id: "trial",
    name: "Prueba gratuita 7 días",
    description: "Acceso completo durante 7 días, luego 49,95€/mes",
    trialPrice: 0,
    monthlyPrice: 49.95,
    currency: "eur",
    interval: "month" as const,
    trialDays: 7,
  },
  /** Direct monthly subscription without trial */
  monthly: {
    id: "monthly",
    name: "Plan Mensual",
    description: "Acceso ilimitado mensual",
    trialPrice: null,
    monthlyPrice: 49.95,
    currency: "eur",
    interval: "month" as const,
    trialDays: 0,
  },
} as const;

export type PlanId = keyof typeof PLANS;

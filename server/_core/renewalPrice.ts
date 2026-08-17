/**
 * Cuánto se le cobra a CADA suscripción al renovar.
 *
 * Hasta la migración 0025 el cron leía un único importe del ajuste global y se
 * lo cobraba a todas. Con eso, subir el precio le cambiaba el recibo a quien ya
 * estaba dentro: cobrar 39,95 € a quien autorizó 29,95 € es un contracargo con
 * la razón de su parte, y desmiente el expediente de consentimiento que
 * guardamos en `consents` (donde consta el importe que se le mostró).
 *
 * Regla: manda el precio anclado en la suscripción. El ajuste global es el
 * precio de las ALTAS NUEVAS y solo se usa como red para filas antiguas que
 * todavía no tienen anclaje (las fija `scripts/backfill-precio-anclado.mjs`).
 */

/** Techo de cordura: nunca cobrar más de esto por una renovación mensual. */
export const MAX_RENEWAL_CENTS = 9900;

export function resolveRenewalAmountCents(i: {
  /** `subscriptions.recurringCents` — lo que aceptó esta persona. */
  pinnedCents?: number | null;
  /** `site_settings.subscription_price_eur` × 100 — precio de altas nuevas. */
  globalCents: number;
}): { amountCents: number; source: "pinned" | "global" } {
  const pinned = i.pinnedCents;
  // Solo un anclaje con sentido manda. Un 0, un negativo o un importe absurdo
  // por un dato corrupto no puede convertirse en "cobrar 0 €" ni en un cargo
  // desproporcionado: en ese caso mejor el ajuste global, que es supervisado.
  if (typeof pinned === "number" && Number.isFinite(pinned) && pinned > 0 && pinned <= MAX_RENEWAL_CENTS) {
    return { amountCents: Math.round(pinned), source: "pinned" };
  }
  return { amountCents: Math.round(i.globalCents), source: "global" };
}

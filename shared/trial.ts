// Trial-period pure helpers, shared by the server (getTrialDays) and the client
// (checkout billing notice) so the config value and the copy can never drift.

/**
 * Parse + clamp the trial length (days) from a raw site_settings value.
 * Default 7 (the policy), clamped to [1, 30] so a bad/empty/garbage setting can
 * never zero-out or blow up billing. Rounds fractional values.
 */
export function clampTrialDays(raw: string | null | undefined): number {
  const n = Math.round(Number((raw ?? "").trim()));
  return Number.isFinite(n) && n >= 1 && n <= 30 ? n : 7;
}

/**
 * Fill the checkout billing-notice template with the live values. Keeps the
 * copy in lockstep with the config: {intro} = charged today, {days} = trial
 * length, {price} = the monthly price charged afterwards.
 */
export function fillNotice(
  tpl: string | null | undefined,
  vars: { intro: string; days: number; price: string },
): string {
  return (tpl ?? "")
    .replace(/\{intro\}/g, vars.intro)
    .replace(/\{days\}/g, String(vars.days))
    .replace(/\{price\}/g, vars.price);
}

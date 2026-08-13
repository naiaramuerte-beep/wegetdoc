// Trial-period pure helpers, shared by the server (getTrialHours) and the client
// (checkout billing notice) so the config value and the copy can never drift.

/**
 * Parse + clamp the trial length (HOURS) from a raw site_settings value.
 *
 * Default 24 (the policy since 2026-08-11), clamped to [1, 720] so a bad, empty
 * or garbage setting can never zero-out or blow up billing. Rounds fractional
 * values.
 *
 * The unit is hours, not days, because the trial is now shorter than a day and
 * the first charge falls exactly 24 h after the signup — to the minute. Storing
 * days would have forced a fraction (0,04166…) into billing arithmetic.
 */
export function clampTrialHours(raw: string | null | undefined): number {
  const n = Math.round(Number((raw ?? "").trim()));
  return Number.isFinite(n) && n >= 1 && n <= 720 ? n : 24;
}

/**
 * Fill the checkout billing-notice template with the live values. Keeps the
 * copy in lockstep with the config: {intro} = charged today, {hours} = trial
 * length in hours, {price} = the monthly price charged afterwards.
 *
 * `{days}` stays supported so a stale translation still renders a number
 * instead of a raw placeholder; it receives the length converted to whole days
 * (rounded up, minimum 1).
 */
export function fillNotice(
  tpl: string | null | undefined,
  vars: { intro: string; hours: number; price: string },
): string {
  const days = Math.max(1, Math.ceil(vars.hours / 24));
  return (tpl ?? "")
    .replace(/\{intro\}/g, vars.intro)
    .replace(/\{hours\}/g, String(vars.hours))
    .replace(/\{days\}/g, String(days))
    .replace(/\{price\}/g, vars.price);
}

/**
 * End of the trial for a signup happening at `startedAt`.
 *
 * One place decides it so the three checkout paths (card, Google Pay, Apple
 * Pay) can never drift apart — which is exactly how the duplicate-charge bug
 * survived three copies of the same flow.
 */
export function trialEndFrom(startedAt: Date, hours: number): Date {
  return new Date(startedAt.getTime() + hours * 60 * 60 * 1000);
}

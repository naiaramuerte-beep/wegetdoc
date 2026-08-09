// Analytics event helper — forwards to GA4 (gtag) and Hotjar (hj) when
// they're present on window. Both are loaded in client/index.html, but
// adblockers strip them transparently, so every call is wrapped in
// try/catch so a missing tracker can NEVER take down the app it's
// observing. Hotjar's API only accepts an event name (no params), while
// GA4 accepts a flat object of strings/numbers.

// Literal-union name so TS catches typos at the call site — these are
// the only events the payment funnel emits.
export type EventName =
  | "paywall_shown"
  | "register_completed"
  | "pay_clicked"
  | "card_tokenized"
  | "3ds_started"
  | "payment_success"
  | "payment_failed"
  | "pay_canceled";

export type EventParams = Record<string, string | number | undefined>;

/**
 * Internal-test flag. When localStorage.internal_test === "1", ALL analytics are
 * suppressed so our own QA/testing never pollutes GA4 or Hotjar (or the Google
 * Ads conversion). Toggle it via the hidden /internal-test route.
 */
export function isInternalTest(): boolean {
  try {
    return localStorage.getItem("internal_test") === "1";
  } catch {
    return false;
  }
}

export function trackEvent(name: EventName, params?: EventParams): void {
  if (isInternalTest()) return;
  // GA4 — full event with params object.
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("event", name, params ?? {});
    }
  } catch {
    // Swallowed: an adblocker hooked gtag to throw, or the global is
    // there but malformed. Either way, we don't want analytics breaking
    // the checkout it's measuring.
  }
  // Hotjar — accepts only the event name. No params.
  try {
    const w = window as unknown as { hj?: (...args: unknown[]) => void };
    if (typeof w.hj === "function") {
      w.hj("event", name);
    }
  } catch {
    // Same rationale as above.
  }
}

// When a wallet (Apple Pay / Google Pay) doesn't complete, we always fall
// through to the card form so the buyer is never stuck. Only the TONE differs:
//
//  - "declined": the bank/acquirer rejected an ACTUAL charge → show the amber
//    "couldn't complete with <wallet>, try your card" banner.
//  - "dismissed": the buyer cancelled, had no usable card, or the sheet failed
//    to start → open the card form SILENTLY. Cancelling (or having no compatible
//    card) is not a failure and must never raise an alarm.
//
// Apple Pay dead-ends map like this:
//   charge declined        → "declined"  (banner)
//   user cancelled          → "dismissed" (silent)
//   no usable card / begin() threw / merchant-validation failed → "dismissed" (silent)
export type WalletOutcome = "declined" | "dismissed";

export function walletFallback(outcome: WalletOutcome): { openCard: true; showBanner: boolean } {
  return { openCard: true, showBanner: outcome === "declined" };
}

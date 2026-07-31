// Apple Pay is offered only for the card networks that actually settle through
// our PSP (Sipay/Comercia → Redsys).
//
// Forensics over 90 days (webhook_events): every one of 89 Visa Apple Pay
// attempts was declined (Redsys code 190/180, 0% success) and both Amex attempts
// failed, while Mastercard cleared ~88% (45/51). The Visa/Amex Apple Pay tokens
// carry the 3DS cryptogram + ECI (we request merchantCapabilities:["supports3DS"])
// yet the acquirer does not relay them to Redsys for those schemes — an issue on
// their side, not ours.
//
// Until the acquirer fixes Visa/Amex Apple Pay, we drop them from
// supportedNetworks. Effect: a wallet with only a Visa/Amex card no longer shows
// the Apple Pay button and the buyer falls through to the card form (manual Visa
// entry works fine, ~75% approval), while Mastercard buyers keep paying via
// Apple Pay exactly as before. Re-add "visa"/"amex" once the acquirer confirms
// the fix.
export const APPLE_PAY_NETWORKS: string[] = ["masterCard", "maestro"];

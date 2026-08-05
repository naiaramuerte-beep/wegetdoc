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
// REVERTIDO 2026-08-05: la reactivación de Visa en Apple Pay (Comercia terminal 1,
// 4-ago) NO arregló el defecto. 6 intentos reales de Apple Pay con Visa tras la
// reactivación → 6/6 FALLARON (Redsys 190, 0 aprobados). Por la regla de reversión
// (5 fallos → revertir), Visa vuelve a salir de supportedNetworks. Amex sigue fuera
// (0/2). Mastercard/Maestro liquidan bien. Vigilancia: scripts/watch-apay-visa.mjs.
export const APPLE_PAY_NETWORKS: string[] = ["masterCard", "maestro"];

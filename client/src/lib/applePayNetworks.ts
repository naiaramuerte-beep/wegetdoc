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
// UPDATE 2026-08-04: Comercia activó Apple Pay + Google Pay en el terminal 1 del
// comercio y confirmó MIT activo. Reactivamos SOLO Visa para verificar en
// producción si eso arregla el defecto (una sola variable: Amex sigue fuera,
// 0/2). REGLA DE REVERSIÓN: si los primeros 5 intentos de Apple Pay con Visa
// fallan (190/180), se revierte este cambio; si alguno aprueba, la activación lo
// ha arreglado y Visa se queda. Vigilancia: scripts/watch-apay-visa.mjs.
//
// Amex se mantiene fuera hasta que el acquirer lo confirme por separado.
export const APPLE_PAY_NETWORKS: string[] = ["masterCard", "maestro", "visa"];

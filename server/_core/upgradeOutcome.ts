/**
 * ¿Qué hacer cuando falla el "upgrade de 1 clic" (el usuario se topa con el
 * límite de descargas de la prueba y PIDE pagar el mensual ya)?
 *
 * El cobro se intenta contra la tarjeta guardada sin autenticación (MIT), que es
 * justo lo que más rechaza el emisor. Si se rechaza, el cliente TIENE que poder
 * meter una tarjeta a mano: ese pago sí lleva 3DS y se aprueba donde el MIT no
 * —está medido en las altas, donde el mismo cliente al que rechazan el wallet
 * paga con tarjeta 1-8 minutos después.
 *
 * EL FALLO QUE ARREGLA ESTO (2026-08-19): la clasificación comparaba el motivo
 * con `card_declined`, `expired_card`, `incorrect_cvc`, `insufficient_funds` y
 * `do_not_honor` — vocabulario de STRIPE. Sipay dice `authorization_error` con
 * código Redsys 190, que no estaba en la lista, así que TODO rechazo se trataba
 * como avería del sistema y el modal nunca ofrecía la tarjeta. Resultado medido:
 * 11 upgrades rechazados en 21 días, ninguno con salida; los dos del 18-ago no
 * volvieron a pagar nunca. Eran los compradores más decididos que hay — habían
 * pulsado el botón de pagar el precio completo.
 *
 * Regla nueva, invertida a propósito: **por defecto se ofrece la tarjeta**. Que
 * sobre un formulario que el cliente puede ignorar cuesta cero; que falte cuando
 * quería pagar cuesta la venta.
 */

export type UpgradeFailureCode = "CARD_ERROR" | "SIPAY_ERROR";

/** Motivos en los que meter otra tarjeta NO arregla nada: es cosa nuestra. */
const NO_LO_ARREGLA_LA_TARJETA = new Set([
  "no_sub",
  "not_trial",
  "no_token",          // sin tarjeta vaulteada: el paywall completo ya cubre esto
  "config_error",
  "signature_error",   // firma HMAC mal: avería nuestra, no del cliente
]);

export function classifyUpgradeFailure(i: {
  /** `detail` de Sipay: `authorization_error`, `card_error`, `no_card_from_token`… */
  detail?: string | null;
  /** Código Redsys (`190`, `174`, …). Un código presente y distinto de 0 = el banco lo vio y lo denegó. */
  responseCode?: string | number | null;
}): UpgradeFailureCode {
  const detail = String(i.detail ?? "").trim().toLowerCase();
  if (NO_LO_ARREGLA_LA_TARJETA.has(detail)) return "SIPAY_ERROR";

  // Si el banco respondió con un código de denegación, es rechazo de tarjeta:
  // otra tarjeta (o la misma con 3DS) puede pasar perfectamente.
  const code = String(i.responseCode ?? "").trim();
  if (code && code !== "0") return "CARD_ERROR";

  // Por defecto, ofrecer la tarjeta. Incluye `authorization_error` (lo que manda
  // Sipay de verdad), `no_card_from_token`, timeouts y lo desconocido.
  return "CARD_ERROR";
}

/**
 * Qué pasa cuando el cliente pulsa "pagar ya el mensual" y el cobro se rechaza.
 * Lo que protege esto: que SIEMPRE se le ofrezca meter una tarjeta, porque es un
 * comprador decidido y perderlo es perder la venta entera.
 */
import { describe, it, expect } from "vitest";
import { classifyUpgradeFailure } from "./upgradeOutcome";

describe("classifyUpgradeFailure", () => {
  it("REGRESIÓN: `authorization_error` de Sipay ofrece tarjeta (antes no)", () => {
    // Es literalmente lo que devolvió Sipay en los 11 upgrades rechazados en
    // 21 días. Con la lista de códigos de Stripe caía en SIPAY_ERROR y el
    // cliente se quedaba sin forma de pagar.
    expect(classifyUpgradeFailure({ detail: "authorization_error", responseCode: "190" })).toBe("CARD_ERROR");
    expect(classifyUpgradeFailure({ detail: "authorization_error" })).toBe("CARD_ERROR");
  });

  it("cualquier código de denegación del banco ofrece tarjeta", () => {
    for (const c of ["190", "174", "172", "195", "121", "180", 190]) {
      expect(classifyUpgradeFailure({ detail: "authorization_error", responseCode: c })).toBe("CARD_ERROR");
    }
  });

  it("sigue tratando los motivos de Stripe como rechazo de tarjeta", () => {
    for (const d of ["card_declined", "expired_card", "incorrect_cvc", "insufficient_funds", "do_not_honor"]) {
      expect(classifyUpgradeFailure({ detail: d })).toBe("CARD_ERROR");
    }
  });

  it("un token que no resuelve a tarjeta también se arregla metiendo una", () => {
    expect(classifyUpgradeFailure({ detail: "no_card_from_token" })).toBe("CARD_ERROR");
  });

  it("lo desconocido y los timeouts ofrecen tarjeta: por defecto se intenta cobrar", () => {
    expect(classifyUpgradeFailure({ detail: "unknown" })).toBe("CARD_ERROR");
    expect(classifyUpgradeFailure({ detail: "", responseCode: null })).toBe("CARD_ERROR");
    expect(classifyUpgradeFailure({})).toBe("CARD_ERROR");
  });

  it("NO ofrece tarjeta cuando meterla no arregla nada", () => {
    for (const d of ["no_sub", "not_trial", "no_token", "config_error", "signature_error"]) {
      expect(classifyUpgradeFailure({ detail: d })).toBe("SIPAY_ERROR");
    }
  });

  it("no se despista con mayúsculas ni espacios", () => {
    expect(classifyUpgradeFailure({ detail: "  NO_SUB  " })).toBe("SIPAY_ERROR");
    expect(classifyUpgradeFailure({ detail: "Authorization_Error" })).toBe("CARD_ERROR");
  });
});

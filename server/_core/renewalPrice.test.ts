/**
 * El importe de cada renovación. Lo que protege esto: que una subida de precio
 * (29,95 € → 39,95 €) no le llegue a quien ya autorizó el importe anterior.
 */
import { describe, it, expect } from "vitest";
import { resolveRenewalAmountCents, MAX_RENEWAL_CENTS } from "./renewalPrice";

const GLOBAL_NUEVO = 3995; // el precio nuevo de las altas

describe("resolveRenewalAmountCents", () => {
  it("REGRESIÓN: quien aceptó 29,95 € sigue pagando 29,95 € aunque suba el global", () => {
    const r = resolveRenewalAmountCents({ pinnedCents: 2995, globalCents: GLOBAL_NUEVO });
    expect(r).toEqual({ amountCents: 2995, source: "pinned" });
  });

  it("las altas nuevas pagan el precio nuevo", () => {
    const r = resolveRenewalAmountCents({ pinnedCents: 3995, globalCents: GLOBAL_NUEVO });
    expect(r).toEqual({ amountCents: 3995, source: "pinned" });
  });

  it("una fila sin anclar cae al ajuste global (filas anteriores a la 0025)", () => {
    expect(resolveRenewalAmountCents({ pinnedCents: null, globalCents: 2995 }))
      .toEqual({ amountCents: 2995, source: "global" });
    expect(resolveRenewalAmountCents({ pinnedCents: undefined, globalCents: 2995 }).source).toBe("global");
  });

  it("respeta cohortes viejas distintas (19,95 € y 39,90 € del A/B)", () => {
    expect(resolveRenewalAmountCents({ pinnedCents: 1995, globalCents: GLOBAL_NUEVO }).amountCents).toBe(1995);
    expect(resolveRenewalAmountCents({ pinnedCents: 3990, globalCents: GLOBAL_NUEVO }).amountCents).toBe(3990);
  });

  it("un anclaje corrupto NO se convierte en cobrar 0 €", () => {
    for (const malo of [0, -100, NaN, Infinity]) {
      const r = resolveRenewalAmountCents({ pinnedCents: malo, globalCents: GLOBAL_NUEVO });
      expect(r).toEqual({ amountCents: GLOBAL_NUEVO, source: "global" });
    }
  });

  it("un anclaje disparatado tampoco pasa: techo de cordura", () => {
    const r = resolveRenewalAmountCents({ pinnedCents: MAX_RENEWAL_CENTS + 1, globalCents: GLOBAL_NUEVO });
    expect(r.source).toBe("global");
    expect(resolveRenewalAmountCents({ pinnedCents: MAX_RENEWAL_CENTS, globalCents: GLOBAL_NUEVO }).source).toBe("pinned");
  });

  it("redondea a céntimo entero (nunca manda decimales a la pasarela)", () => {
    expect(resolveRenewalAmountCents({ pinnedCents: 2995.4, globalCents: 1 }).amountCents).toBe(2995);
    expect(resolveRenewalAmountCents({ pinnedCents: null, globalCents: 3994.6 }).amountCents).toBe(3995);
  });
});

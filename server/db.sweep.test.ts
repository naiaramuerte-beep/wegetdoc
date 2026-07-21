import { describe, it, expect } from "vitest";
import { shouldCancelExpiredSub } from "./db";

// Predicado puro del barrido de bajas vencidas (cancelAtPeriodEnd=true +
// currentPeriodEnd < now → canceled). Cubre subs 475/484 y futuras.
describe("shouldCancelExpiredSub", () => {
  const now = new Date("2026-07-21T10:00:00.000Z");
  const past = new Date("2026-07-20T10:00:00.000Z");
  const future = new Date("2026-07-25T10:00:00.000Z");

  it("baja pendiente + periodo vencido + past_due → cancela (caso 475/484)", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: past, status: "past_due" }, now)).toBe(true);
  });

  it("baja pendiente + vencido + active → cancela", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: past, status: "active" }, now)).toBe(true);
  });

  it("baja pendiente + vencido + trialing → cancela", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: past, status: "trialing" }, now)).toBe(true);
  });

  it("baja pendiente pero periodo AÚN NO vencido → no cancela (sigue con servicio)", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: future, status: "active" }, now)).toBe(false);
  });

  it("sin baja pendiente (cancelAtPeriodEnd=false) → no cancela nunca", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: false, currentPeriodEnd: past, status: "past_due" }, now)).toBe(false);
  });

  it("ya cancelada → no se vuelve a tocar", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: past, status: "canceled" }, now)).toBe(false);
  });

  it("currentPeriodEnd null → no cancela (no hay fecha de vencimiento)", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: null, status: "past_due" }, now)).toBe(false);
  });

  it("cancelAtPeriodEnd null → no cancela", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: null, currentPeriodEnd: past, status: "past_due" }, now)).toBe(false);
  });

  it("justo en el borde (currentPeriodEnd == now) → no cancela (estricto <)", () => {
    expect(shouldCancelExpiredSub({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date(now), status: "active" }, now)).toBe(false);
  });
});

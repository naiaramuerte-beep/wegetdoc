import { describe, it, expect } from "vitest";
import {
  isTestEmail, buildCycles, block1, block2, block3, cohortOf, MIN_SAMPLE,
  type ChargeRow, type SubRow,
} from "./trialConversion";

const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 7, 20, 9, 0); // 2026-08-20 09:00 UTC
const ch = (userId: number, amountCents: number, ok: boolean, dayOffset: number, isUpgrade = false): ChargeRow =>
  ({ userId, amountCents, ok, createdAtMs: NOW - dayOffset * DAY, isUpgrade });

describe("isTestEmail", () => {
  it("detecta cuentas internas y deja pasar clientes", () => {
    for (const e of ["a@test.com", "prueba@x.com", "sergisd39@gmail.com", "x@example.com"]) expect(isTestEmail(e)).toBe(true);
    for (const e of ["cliente@gmail.com", "juan@hotmail.es", null, ""]) expect(isTestEmail(e)).toBe(false);
  });
});

describe("buildCycles — agrupación en ciclos de renovación", () => {
  it("reintentos dentro de 25d = 1 ciclo; firstOk vs cycleOk", () => {
    // fallo, fallo +2d, OK +5d  → 1 ciclo, primer intento falló pero el ciclo acabó OK
    const cycles = buildCycles([ch(1, 2995, false, 30), ch(1, 2995, false, 28), ch(1, 2995, true, 25)]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({ amountCents: 2995, firstOk: false, cycleOk: true });
  });
  it("un cargo a >25d abre ciclo nuevo", () => {
    const cycles = buildCycles([ch(1, 2995, true, 60), ch(1, 2995, true, 20)]);
    expect(cycles).toHaveLength(2);
    expect(cycles.every((c) => c.firstOk && c.cycleOk)).toBe(true);
  });
  it("ignora upgrades (mit-upgrade-)", () => {
    expect(buildCycles([ch(1, 2995, true, 5, true)])).toHaveLength(0);
  });
  it("el ciclo hereda el importe del PRIMER intento", () => {
    const cycles = buildCycles([ch(1, 2995, false, 10), ch(1, 2995, false, 8)]);
    expect(cycles[0].amountCents).toBe(2995);
  });
});

describe("block1 — aceptación MIT (7/30d, importe actual vs otros)", () => {
  const cycles = [
    // dentro de 7d, 29,95: 3 ciclos, 1 OK a primer intento, 2 acaban OK al final
    ch(1, 2995, true, 2), // firstOk + cycleOk
    ...[ch(2, 2995, false, 3), ch(2, 2995, true, 1)],  // cycleOk (retry), firstOk=false
    ch(3, 2995, false, 4), // ni first ni final
  ].reduce<ChargeRow[]>((a, c) => (a.push(c), a), []);

  it("primer intento vs final, con n y flag de muestra insuficiente", () => {
    const r = block1(buildCycles(cycles), { currentAmountCents: 2995, nowMs: NOW });
    // 3 ciclos de 29,95 en 7d: user1(first ok), user2(first fail, final ok), user3(fail)
    expect(r.d7.first).toMatchObject({ ok: 1, n: 3 });
    expect(r.d7.final).toMatchObject({ ok: 2, n: 3 });
    expect(r.d7.first.insufficient).toBe(true); // n<20
    expect(r.baselinePct).toBe(35.3);
  });
  it("separa el importe actual de otros importes", () => {
    const cs = buildCycles([ch(1, 2995, true, 2), ch(2, 1995, false, 2)]);
    const r = block1(cs, { currentAmountCents: 2995, nowMs: NOW });
    expect(r.d30.final).toMatchObject({ ok: 1, n: 1 });   // 29,95
    expect(r.d30.other).toMatchObject({ ok: 0, n: 1 });   // 19,95 aparte
  });
  it("30d incluye lo que 7d no", () => {
    const cs = buildCycles([ch(1, 2995, true, 20)]);
    const r = block1(cs, { currentAmountCents: 2995, nowMs: NOW });
    expect(r.d7.final.n).toBe(0);
    expect(r.d30.final.n).toBe(1);
  });
});

const sub = (o: Partial<SubRow> & { userId: number }): SubRow => ({
  email: "c@gmail.com", trialDays: 7, cancelAtPeriodEnd: false, status: "trialing",
  declineCategory: null, altaWeek: "2026-08-10", createdAtMs: NOW - 10 * DAY,
  periodEndMs: NOW - 3 * DAY, mitOk: 0, ...o,
});

describe("block2 — cohortes semanales por trialDays", () => {
  it("separa 48h vs 7d y calcula conversión", () => {
    const subs: SubRow[] = [
      sub({ userId: 1, trialDays: 7, mitOk: 1 }),                       // 7d, pagó
      sub({ userId: 2, trialDays: 7, cancelAtPeriodEnd: true }),        // 7d, canceló pre-cobro
      sub({ userId: 3, trialDays: 2, mitOk: 1 }),                       // 48h, pagó
      sub({ userId: 4, trialDays: null, mitOk: 0, status: "canceled", declineCategory: "soft" }), // 48h, falló
    ];
    const rows = block2(subs, { nowMs: NOW });
    const c7 = rows.find((r) => r.cohort === "7d")!;
    const c48 = rows.find((r) => r.cohort === "48h")!;
    expect(c7).toMatchObject({ altas: 2, paid: 1, canceledPre: 1, convPct: 50 });
    expect(c48).toMatchObject({ altas: 2, paid: 1, failed: 1 });
  });
  it("marca cohorte en curso si alguna sigue en trial", () => {
    const rows = block2([
      sub({ userId: 1, periodEndMs: NOW + 2 * DAY }), // aún en trial
      sub({ userId: 2, periodEndMs: NOW - 1 * DAY }),
    ], { nowMs: NOW });
    expect(rows[0].inProgress).toBe(true);
  });
  it("excluye cuentas de prueba", () => {
    const rows = block2([sub({ userId: 1, email: "prueba@x.com" })], { nowMs: NOW });
    expect(rows).toHaveLength(0);
  });
  it("cohortOf mapea null/2→48h, 7→7d", () => {
    expect(cohortOf(null)).toBe("48h"); expect(cohortOf(2)).toBe("48h"); expect(cohortOf(7)).toBe("7d");
  });
});

describe("block3 — dónde se pierden (30d)", () => {
  it("clasifica por motivo con número y %", () => {
    const subs: SubRow[] = [
      sub({ userId: 1, cancelAtPeriodEnd: true, status: "canceled" }),                    // usuario
      sub({ userId: 2, declineCategory: "hard", status: "canceled" }),                    // código duro
      sub({ userId: 3, declineCategory: "blocked_provider", status: "past_due" }),        // bloqueada
      sub({ userId: 4, declineCategory: "soft", status: "canceled" }),                    // reintentos agotados
      sub({ userId: 5, mitOk: 1 }),                                                       // convirtió → no cuenta
      sub({ userId: 6, status: "trialing" }),                                             // en curso → no terminal
    ];
    const r = block3(subs, { nowMs: NOW });
    expect(r).toMatchObject({ total: 4, usuario: 1, codigoDuro: 1, blockedProvider: 1, reintentosAgotados: 1 });
    expect(r.pct).toMatchObject({ usuario: 25, codigoDuro: 25, blockedProvider: 25, reintentosAgotados: 25 });
  });
  it("respeta la ventana de 30 días y excluye test", () => {
    const r = block3([
      sub({ userId: 1, cancelAtPeriodEnd: true, createdAtMs: NOW - 40 * DAY }), // fuera de ventana
      sub({ userId: 2, cancelAtPeriodEnd: true, email: "test@x.com" }),          // test
    ], { nowMs: NOW });
    expect(r.total).toBe(0);
  });
  it("MIN_SAMPLE marca muestra insuficiente", () => {
    expect(MIN_SAMPLE).toBe(20);
    const r = block3([sub({ userId: 1, cancelAtPeriodEnd: true })], { nowMs: NOW });
    expect(r.insufficient).toBe(true);
  });
});

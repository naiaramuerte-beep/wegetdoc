import { describe, it, expect } from "vitest";
import { clampTrialHours, fillNotice, trialEndFrom } from "@shared/trial";
import { cohortOf } from "./trialConversion";

describe("clampTrialHours — single trial-length config", () => {
  it("defaults to 24 for empty / garbage / out-of-range", () => {
    for (const v of [null, undefined, "", "  ", "abc", "0", "-3", "721", "100000"]) {
      expect(clampTrialHours(v)).toBe(24);
    }
  });
  it("reads a valid value (incl. the older 48h and 7d lengths)", () => {
    expect(clampTrialHours("24")).toBe(24);
    expect(clampTrialHours("48")).toBe(48);
    expect(clampTrialHours("168")).toBe(168); // 7 días
    expect(clampTrialHours(" 12 ")).toBe(12);
    expect(clampTrialHours("1")).toBe(1);     // min
    expect(clampTrialHours("720")).toBe(720); // max
  });
  it("rounds fractional values", () => {
    expect(clampTrialHours("23.6")).toBe(24);
    expect(clampTrialHours("12.2")).toBe(12);
  });
});

describe("trialEndFrom — the first charge lands exactly 24 h after the alta", () => {
  it("adds the hours to the minute", () => {
    const alta = new Date("2026-08-12T15:47:31.000Z");
    expect(trialEndFrom(alta, 24).toISOString()).toBe("2026-08-13T15:47:31.000Z");
  });
  it("crosses a month boundary without drifting", () => {
    expect(trialEndFrom(new Date("2026-08-31T23:30:00.000Z"), 24).toISOString())
      .toBe("2026-09-01T23:30:00.000Z");
  });
  it("still supports the legacy lengths, so a rollback is a config change", () => {
    const alta = new Date("2026-08-12T10:00:00.000Z");
    expect(trialEndFrom(alta, 48).toISOString()).toBe("2026-08-14T10:00:00.000Z");
    expect(trialEndFrom(alta, 168).toISOString()).toBe("2026-08-19T10:00:00.000Z");
  });
  it("does not mutate the date it is given", () => {
    const alta = new Date("2026-08-12T10:00:00.000Z");
    trialEndFrom(alta, 24);
    expect(alta.toISOString()).toBe("2026-08-12T10:00:00.000Z");
  });
});

describe("fillNotice — checkout copy stays in lockstep with the config", () => {
  const tpl = "Hoy {intro}. En {hours} horas: {price}/mes. Cancela antes.";
  it("fills the three placeholders (charged today / hours / price)", () => {
    expect(fillNotice(tpl, { intro: "0,50€", hours: 24, price: "29,95€" }))
      .toBe("Hoy 0,50€. En 24 horas: 29,95€/mes. Cancela antes.");
  });
  it("reflects a changed trial length without touching copy", () => {
    expect(fillNotice(tpl, { intro: "0,50€", hours: 48, price: "29,95€" })).toContain("En 48 horas:");
  });
  it("still fills a stale {days} translation, converted to whole days", () => {
    const viejo = "El día {days} se cobra {price}.";
    expect(fillNotice(viejo, { intro: "0,50€", hours: 24, price: "29,95€" })).toBe("El día 1 se cobra 29,95€.");
    expect(fillNotice(viejo, { intro: "0,50€", hours: 168, price: "29,95€" })).toBe("El día 7 se cobra 29,95€.");
  });
  it("never leaves a raw {hours}/{days}/{price}/{intro} token", () => {
    const todos = "{intro} {hours} {days} {price}";
    expect(fillNotice(todos, { intro: "0,50€", hours: 24, price: "29,95€" }))
      .not.toMatch(/\{(hours|days|price|intro)\}/);
  });
  it("handles a null template", () => {
    expect(fillNotice(null, { intro: "x", hours: 24, price: "y" })).toBe("");
  });
});

describe("cohortOf — las altas nuevas no se mezclan con las viejas", () => {
  it("etiqueta 24h cuando la sub trae trialHours", () => {
    expect(cohortOf(null, 24)).toBe("24h");
  });
  it("trialHours manda sobre trialDays si por lo que sea vinieran los dos", () => {
    expect(cohortOf(7, 24)).toBe("24h");
  });
  it("mantiene las cohortes históricas leyendo trialDays", () => {
    expect(cohortOf(7, null)).toBe("7d");
    expect(cohortOf(2, null)).toBe("48h");
    expect(cohortOf(null, null)).toBe("48h"); // pre-columna = 48h
    expect(cohortOf(5, null)).toBe("otro");
  });
  it("reconoce las longitudes viejas también expresadas en horas", () => {
    expect(cohortOf(null, 48)).toBe("48h");
    expect(cohortOf(null, 168)).toBe("7d");
    expect(cohortOf(null, 72)).toBe("otro");
  });
});

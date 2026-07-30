import { describe, it, expect } from "vitest";
import { clampTrialDays, fillNotice } from "@shared/trial";

describe("clampTrialDays — single trial-length config", () => {
  it("defaults to 7 for empty / garbage / out-of-range", () => {
    for (const v of [null, undefined, "", "  ", "abc", "0", "-3", "31", "1000"]) {
      expect(clampTrialDays(v)).toBe(7);
    }
  });
  it("reads a valid value (incl. the old 48h=2 cohort if ever set)", () => {
    expect(clampTrialDays("7")).toBe(7);
    expect(clampTrialDays("2")).toBe(2);
    expect(clampTrialDays(" 5 ")).toBe(5);
    expect(clampTrialDays("1")).toBe(1);   // min
    expect(clampTrialDays("30")).toBe(30); // max
  });
  it("rounds fractional values", () => {
    expect(clampTrialDays("6.6")).toBe(7);
    expect(clampTrialDays("2.2")).toBe(2);
  });
});

describe("fillNotice — checkout copy stays in lockstep with the config", () => {
  const tpl = "Hoy {intro}. El día {days}: {price}/mes. Cancela antes.";
  it("fills the three placeholders (charged today / day N / price)", () => {
    expect(fillNotice(tpl, { intro: "0,50€", days: 7, price: "29,95€" }))
      .toBe("Hoy 0,50€. El día 7: 29,95€/mes. Cancela antes.");
  });
  it("reflects a changed trial length without touching copy", () => {
    expect(fillNotice(tpl, { intro: "0,50€", days: 2, price: "29,95€" })).toContain("El día 2:");
  });
  it("never leaves a raw {days}/{price}/{intro} token", () => {
    const out = fillNotice(tpl, { intro: "0,50€", days: 7, price: "29,95€" });
    expect(out).not.toMatch(/\{(days|price|intro)\}/);
  });
  it("handles a null template", () => {
    expect(fillNotice(null, { intro: "x", days: 7, price: "y" })).toBe("");
  });
});

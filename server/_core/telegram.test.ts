import { describe, it, expect } from "vitest";
import { resolveCountryCode, saleLabels } from "./telegram";

describe("saleLabels — Telegram sale kind", () => {
  it("labels a trial→monthly upgrade distinctly from a cron renewal", () => {
    expect(saleLabels("mit", "mit-upgrade-92544-1700000000000")).toEqual({ method: "Upgrade a mensual", kind: "⬆️ Desde trial" });
    expect(saleLabels("mit", "mit-92544-1700000000000")).toEqual({ method: "Renovación mensual", kind: "🔄 Renovación" });
    expect(saleLabels("mit", null)).toEqual({ method: "Renovación mensual", kind: "🔄 Renovación" });
  });

  it("labels new sign-ups (wallets / card) as altas", () => {
    expect(saleLabels("gpay", "gpay-1")).toEqual({ method: "Google Pay", kind: "🆕 Alta nueva" });
    expect(saleLabels("apay")).toEqual({ method: "Apple Pay", kind: "🆕 Alta nueva" });
    expect(saleLabels("fastpay")).toEqual({ method: "Tarjeta", kind: "🆕 Alta nueva" });
  });
});

describe("resolveCountryCode — Telegram sale flag", () => {
  it("prefers a valid browser-geo alpha-2 over the card country", () => {
    expect(resolveCountryCode("ES", 804)).toBe("ES");
    expect(resolveCountryCode("us", 724)).toBe("US"); // uppercased
  });

  it("falls back to the card's numeric issuing country when geo is empty", () => {
    expect(resolveCountryCode("", 724)).toBe("ES");
    expect(resolveCountryCode(null, 804)).toBe("UA");
    expect(resolveCountryCode(undefined, 276)).toBe("DE");
  });

  it("accepts the numeric card country as a string too (Sipay sends both)", () => {
    expect(resolveCountryCode(null, "620")).toBe("PT");
    expect(resolveCountryCode("", "826")).toBe("GB");
  });

  it("maps the historical 280 (West Germany) code Redsys still uses to DE", () => {
    expect(resolveCountryCode(null, 280)).toBe("DE");
  });

  it("returns '' when nothing usable (so no broken flag renders)", () => {
    expect(resolveCountryCode(null, null)).toBe("");
    expect(resolveCountryCode("", 99999)).toBe(""); // unknown numeric
    expect(resolveCountryCode("X", 0)).toBe("");     // invalid geo + no card
  });
});

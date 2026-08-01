import { describe, it, expect } from "vitest";
import { resolveCountryCode } from "./telegram";

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

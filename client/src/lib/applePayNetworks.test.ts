import { describe, it, expect } from "vitest";
import { APPLE_PAY_NETWORKS } from "./applePayNetworks";

describe("APPLE_PAY_NETWORKS — mitigation for the acquirer's Visa Apple Pay defect", () => {
  it("excludes Visa (89/89 declined by the acquirer)", () => {
    expect(APPLE_PAY_NETWORKS).not.toContain("visa");
  });

  it("excludes Amex (2/2 declined)", () => {
    expect(APPLE_PAY_NETWORKS).not.toContain("amex");
  });

  it("still offers Mastercard (the only scheme that clears, ~88%)", () => {
    expect(APPLE_PAY_NETWORKS).toContain("masterCard");
  });

  it("is non-empty (Apple Pay button must still render for Mastercard buyers)", () => {
    expect(APPLE_PAY_NETWORKS.length).toBeGreaterThan(0);
  });
});

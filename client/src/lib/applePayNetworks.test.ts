import { describe, it, expect } from "vitest";
import { APPLE_PAY_NETWORKS } from "./applePayNetworks";

describe("APPLE_PAY_NETWORKS — Visa reverted (Comercia re-activation did NOT fix it: 6/6 failed 190, 2026-08-05)", () => {
  it("EXCLUDES Visa again (reversion rule fired: first 6 Apple Pay Visa attempts all declined 190)", () => {
    expect(APPLE_PAY_NETWORKS).not.toContain("visa");
  });

  it("still EXCLUDES Amex (0/2, stays out)", () => {
    expect(APPLE_PAY_NETWORKS).not.toContain("amex");
  });

  it("still offers Mastercard (the scheme that already clears, ~88%)", () => {
    expect(APPLE_PAY_NETWORKS).toContain("masterCard");
  });

  it("is non-empty (Apple Pay button must still render)", () => {
    expect(APPLE_PAY_NETWORKS.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { APPLE_PAY_NETWORKS } from "./applePayNetworks";

describe("APPLE_PAY_NETWORKS — Visa re-enabled after Comercia terminal-1 activation (2026-08-04)", () => {
  it("re-includes Visa (test in prod under the reversion rule; revert if first 5 fail 190/180)", () => {
    expect(APPLE_PAY_NETWORKS).toContain("visa");
  });

  it("still EXCLUDES Amex (single variable — Amex 0/2, stays out)", () => {
    expect(APPLE_PAY_NETWORKS).not.toContain("amex");
  });

  it("still offers Mastercard (the scheme that already clears, ~88%)", () => {
    expect(APPLE_PAY_NETWORKS).toContain("masterCard");
  });

  it("is non-empty (Apple Pay button must still render)", () => {
    expect(APPLE_PAY_NETWORKS.length).toBeGreaterThan(0);
  });
});

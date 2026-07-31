import { describe, it, expect } from "vitest";
import { walletFallback } from "./walletFallback";

describe("walletFallback — tone of the wallet→card fallback", () => {
  it("a real decline shows the 'try card' banner and opens the card form", () => {
    expect(walletFallback("declined")).toEqual({ openCard: true, showBanner: true });
  });

  it("a cancellation opens the card form SILENTLY — cancelling is not a failure", () => {
    expect(walletFallback("dismissed")).toEqual({ openCard: true, showBanner: false });
  });

  it("no-usable-card / session-start error also map to a SILENT card form", () => {
    // Both Apple Pay dead-ends route through the "dismissed" outcome.
    expect(walletFallback("dismissed").showBanner).toBe(false);
  });

  it("EVERY wallet dead-end opens the card form — the buyer is never stuck", () => {
    expect(walletFallback("declined").openCard).toBe(true);
    expect(walletFallback("dismissed").openCard).toBe(true);
  });
});

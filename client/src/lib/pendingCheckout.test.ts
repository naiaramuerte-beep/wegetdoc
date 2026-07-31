import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  stashPendingCheckout,
  readPendingCheckout,
  clearPendingCheckout,
  withReopenFlag,
} from "./pendingCheckout";

const KEY = "editorpdf_pending_checkout";

function makeStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("pendingCheckout", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStore());
    vi.stubGlobal("window", {
      location: { href: "https://editorpdf.net/en/pdf-to-word?rk=temp/abc&rn=x.pdf" },
    });
  });

  it("stashes the current href and reads it back", () => {
    stashPendingCheckout();
    const v = readPendingCheckout();
    expect(v?.href).toContain("/pdf-to-word");
    expect(v?.href).toContain("rk=temp/abc"); // doc temp key preserved
  });

  it("returns null when nothing is stashed", () => {
    expect(readPendingCheckout()).toBeNull();
  });

  it("expires markers older than 1h so they never resurrect an old doc", () => {
    localStorage.setItem(KEY, JSON.stringify({ href: "https://x", ts: Date.now() - 2 * 60 * 60 * 1000 }));
    expect(readPendingCheckout()).toBeNull();
  });

  it("clear removes the marker", () => {
    stashPendingCheckout();
    clearPendingCheckout();
    expect(readPendingCheckout()).toBeNull();
  });

  it("ignores malformed markers instead of throwing", () => {
    localStorage.setItem(KEY, "not-json");
    expect(readPendingCheckout()).toBeNull();
  });

  it("withReopenFlag appends reopenPay=1 (with or without an existing query)", () => {
    expect(withReopenFlag("https://x.com/a?b=1")).toMatch(/[?&]reopenPay=1/);
    expect(withReopenFlag("https://x.com/a")).toMatch(/[?&]reopenPay=1/);
  });
});

import { describe, it, expect } from "vitest";
import { pickDownloadDoc } from "@/lib/pickDownloadDoc";

// Reproduces the real incident: user 72366 had two docs, the OLDER (4634) and
// her final edited one (4642). markDocumentsPaid re-stamped both updatedAt, so
// documents.list[0] served 4634 → "pagué y está en blanco". pickDownloadDoc
// must return 4642 (newest by createdAt) regardless of array order.
const docs = [
  { id: 4634, createdAt: "2026-07-20T09:19:00Z" },
  { id: 4642, createdAt: "2026-07-20T09:53:00Z" },
];

describe("pickDownloadDoc", () => {
  it("returns null for empty / undefined / null", () => {
    expect(pickDownloadDoc([])).toBeNull();
    expect(pickDownloadDoc(undefined)).toBeNull();
    expect(pickDownloadDoc(null)).toBeNull();
  });

  it("picks the NEWEST by createdAt, not array order (the 72366 bug)", () => {
    expect(pickDownloadDoc(docs)?.id).toBe(4642);
    expect(pickDownloadDoc([...docs].reverse())?.id).toBe(4642);
  });

  it("honors an explicit forcedId when present", () => {
    expect(pickDownloadDoc(docs, 4634)?.id).toBe(4634);
  });

  it("falls back to newest when forcedId is not found", () => {
    expect(pickDownloadDoc(docs, 9999)?.id).toBe(4642);
  });

  it("ignores a falsy forcedId (0 / null)", () => {
    expect(pickDownloadDoc(docs, 0)?.id).toBe(4642);
    expect(pickDownloadDoc(docs, null)?.id).toBe(4642);
  });

  it("handles Date and epoch-number createdAt", () => {
    const asDate = [
      { id: 1, createdAt: new Date("2026-01-01T00:00:00Z") },
      { id: 2, createdAt: new Date("2026-02-01T00:00:00Z") },
    ];
    expect(pickDownloadDoc(asDate)?.id).toBe(2);
    const asEpoch = [
      { id: 10, createdAt: 1_700_000_000_000 },
      { id: 20, createdAt: 1_800_000_000_000 },
    ];
    expect(pickDownloadDoc(asEpoch)?.id).toBe(20);
  });
});

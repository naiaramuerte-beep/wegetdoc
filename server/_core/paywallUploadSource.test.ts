import { describe, it, expect } from "vitest";
import { pickPaywallUploadSource } from "@/lib/paywallUploadSource";

const REBUILT = { base64: "REBUILT", name: "doc.pdf", size: 100 };
const ONSCREEN = { base64: "ONSCREEN", name: "doc.pdf", size: 100 };

// The regression this guards: closing/registering on the mobile-Google resume
// path used to persist a DIVERGENT snapshot (pdfData) that differed from what
// the user saw → docs with typed text lost and freehand ink relocated. The rule
// is now total: persist the live rebuild in-editor, the on-screen bytes on
// resume, and NEVER a third value.
describe("pickPaywallUploadSource — persisted bytes == what the user sees", () => {
  it("in-editor: uses the live annotated rebuild (authoritative)", () => {
    expect(pickPaywallUploadSource({ hasEditorBytes: true, rebuilt: REBUILT, onScreen: ONSCREEN }))
      .toBe(REBUILT);
  });

  it("in-editor: rebuild failed → returns null (caller RETRIES; never substitutes on-screen)", () => {
    // The critical property: when the build can't run in-editor we do NOT fall
    // back to a different doc. Null tells the caller to retry.
    expect(pickPaywallUploadSource({ hasEditorBytes: true, rebuilt: null, onScreen: ONSCREEN }))
      .toBeNull();
  });

  it("resume (no editor bytes): persists the EXACT on-screen bytes", () => {
    // Post-OAuth remount: pdfBytes + annotations are gone, so the rebuild can't
    // run — the on-screen bytes (restored from the temp key) are the only
    // truthful copy of the edits, identical to preview + download.
    expect(pickPaywallUploadSource({ hasEditorBytes: false, rebuilt: null, onScreen: ONSCREEN }))
      .toBe(ONSCREEN);
  });

  it("resume with nothing on screen → null (never persist a blank/wrong doc)", () => {
    expect(pickPaywallUploadSource({ hasEditorBytes: false, rebuilt: null, onScreen: null }))
      .toBeNull();
  });

  it("never returns a value that is neither the rebuild nor the on-screen bytes", () => {
    const cases = [
      { hasEditorBytes: true, rebuilt: REBUILT, onScreen: ONSCREEN },
      { hasEditorBytes: true, rebuilt: null, onScreen: ONSCREEN },
      { hasEditorBytes: false, rebuilt: REBUILT, onScreen: ONSCREEN },
      { hasEditorBytes: false, rebuilt: null, onScreen: null },
    ];
    for (const c of cases) {
      const out = pickPaywallUploadSource(c);
      expect(out === null || out === c.rebuilt || out === c.onScreen).toBe(true);
    }
  });
});

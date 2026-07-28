import { describe, it, expect } from "vitest";
import { shouldLoadOriginalFile } from "@/lib/resolveResumeSource";
import { pickPaywallUploadSource } from "@/lib/paywallUploadSource";

// #0 — full Google-resume path: with BOTH copies present (original in
// sessionStorage, edited in the temp key), the editor must never load the
// original, and the persisted/exported doc must be the EDITED bytes.
describe("shouldLoadOriginalFile — never let the original shadow the edited draft", () => {
  it("resume with an edited draft pending → do NOT load the original", () => {
    expect(shouldLoadOriginalFile({ hasPendingEdited: true })).toBe(false);
  });

  it("normal open (no edited draft) → load the original as the working doc", () => {
    expect(shouldLoadOriginalFile({ hasPendingEdited: false })).toBe(true);
  });

  it("clear race: pendingEditedPdf cleared by autoResume but resume LATCHED → still suppress the original", () => {
    // autoResume clears pendingEditedPdf after claiming the temp draft; the
    // EditorPage latch ORs the live value with a monotonic ref so the original
    // is never loaded after the clear (the "close shows no changes" bug).
    const pendingEditedNow = false; // cleared
    const resumeLatched = true;     // we entered resume earlier this session
    expect(shouldLoadOriginalFile({ hasPendingEdited: pendingEditedNow || resumeLatched })).toBe(false);
  });
});

describe("#0 end-to-end: original present + edited present → export/persist the EDITED", () => {
  const original = { base64: "ORIGINAL", name: "doc.pdf", size: 100 };
  const edited = { base64: "EDITED", name: "doc.pdf", size: 120 };

  it("original is NOT loaded, so buildPdfForUpload has no editor bytes → returns the edited on-screen doc", () => {
    // Step 1: on resume the original is suppressed → PdfEditor gets no initialFile.
    const loadOriginal = shouldLoadOriginalFile({ hasPendingEdited: true });
    expect(loadOriginal).toBe(false);
    // Step 2: with no editor bytes loaded, the paywall persists/uploads exactly
    // the on-screen (edited) bytes — never the original.
    const persisted = pickPaywallUploadSource({
      hasEditorBytes: loadOriginal, // false → resume branch
      rebuilt: null,
      onScreen: edited,
    });
    expect(persisted).toBe(edited);
    expect(persisted).not.toBe(original);
  });

  it("REGRESSION: if the original WERE loaded, the rebuild would export the unedited original (the bug)", () => {
    // Documents why loading the original is fatal: pdfBytes=original + empty
    // annotations → the rebuild is the original, and it would win over the edited.
    const rebuiltFromOriginal = original; // buildAnnotatedPdf(original, []) === original
    const persisted = pickPaywallUploadSource({
      hasEditorBytes: true, // original loaded
      rebuilt: rebuiltFromOriginal,
      onScreen: edited,
    });
    expect(persisted).toBe(original); // <-- the pre-fix outcome we now prevent upstream
  });
});

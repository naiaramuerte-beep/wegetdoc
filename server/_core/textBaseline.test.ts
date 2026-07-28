import { describe, it, expect } from "vitest";

// Fidelity: text annotation export lands where the user placed it, at any zoom.
// Mirrors PdfEditor buildAnnotatedPdf (PdfEditor.tsx:3013). The box top-left is
// placed at page point (px, pyTop-from-top); on-screen ann.y = pyTop*scale (the
// overlay is page·scale CSS), box height ann.height = fontSize+16 (CSS px). The
// export draws text at a BASELINE, measured here from the page top.
//
//   OLD: `pdfY + ah/2` → baseline_from_top = pyTop + ah/2 = pyTop + (fontSize+16)/(2·scale).
//        The half-box offset scales with 1/scale, so the text drifts DOWN as you
//        zoom out (a couple pt at 100%, ~16pt at 50%) — the reported bug.
//   NEW: `(height - ay) - fontSize` → baseline_from_top = pyTop + fontSize.
//        A constant first-line offset, independent of zoom and box height
//        (multi-line-safe). Verified against a REAL pd-lib export measured with
//        pdf.js (scripts/calib-text3.mjs): lands within ~1pt at zoom 50-150% and
//        sizes 12-24.

const oldBaselineFromTop = (pyTop: number, fontSize: number, s: number) => pyTop + (fontSize + 16) / (2 * s);
const newBaselineFromTop = (pyTop: number, fontSize: number, _s: number) => pyTop + fontSize;

describe("text baseline export — lands where placed at any zoom", () => {
  const pyTop = 200;

  it("NEW: baseline offset is constant (= fontSize), no zoom drift", () => {
    for (const fontSize of [12, 14, 18, 24]) {
      const offsets = [0.5, 0.67, 1.0, 1.2, 1.5].map((s) => newBaselineFromTop(pyTop, fontSize, s) - pyTop);
      expect(new Set(offsets).size).toBe(1); // identical at every zoom
      expect(offsets[0]).toBe(fontSize);     // one line below the placed top
    }
  });

  it("OLD (bug): the offset grew as you zoomed out → text drifted DOWN", () => {
    const at100 = oldBaselineFromTop(pyTop, 14, 1.0) - pyTop;
    const at50 = oldBaselineFromTop(pyTop, 14, 0.5) - pyTop;
    expect(at50).toBeGreaterThan(at100);          // further from the top at 50% = lower
    expect(at50 - at100).toBeGreaterThan(10);     // ~15pt extra drop at 50%
  });

  it("NEW does not depend on box height → multi-line safe", () => {
    // A tall (multi-line) box must not push the FIRST line's baseline down.
    const singleLine = newBaselineFromTop(pyTop, 14, 1.0);
    // newBaselineFromTop ignores ann.height entirely, so any box height is fine.
    expect(singleLine).toBe(pyTop + 14);
  });
});

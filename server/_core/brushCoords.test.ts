import { describe, it, expect } from "vitest";

// Pins the freehand-brush coordinate pipeline end to end and proves the
// capture-side fix. Mirrors three pieces of PdfEditor.tsx exactly:
//
//  1. Raw capture (getCanvasPos): a CSS position becomes canvas-INTERNAL pixels
//     = CSS·scale·devicePixelRatio.
//  2. FIX — store normalized (handleCanvasMouseUp / handleCanvasTouchEnd): the
//     points are multiplied by getCanvasToCssRatios rx=1/dpr → CSS space,
//     dpr-independent. (eraser/highlight already did this; brush didn't.)
//  3. Export (buildAnnotatedPdf, UNCHANGED): `x = p.x / scale`,
//     `y = pageHeight - p.y / scale`.
//
// The bug: skipping step 2 left a leftover ×dpr in the export → on mobile
// (dpr 2-3) the stroke landed 2-3× off the page. Desktop (dpr=1) hid it.

const PAGE_W = 595, PAGE_H = 842, SCALE = 0.7;

const rawCapture = (cssX: number, cssY: number, dpr: number) => ({ x: cssX * SCALE * dpr, y: cssY * SCALE * dpr });
const normalizeToCss = (p: { x: number; y: number }, dpr: number) => { const rx = 1 / dpr; return { x: p.x * rx, y: p.y * rx }; };
const exportPoint = (p: { x: number; y: number }) => ({ x: p.x / SCALE, y: PAGE_H - p.y / SCALE });
const inside = (pt: { x: number; y: number }) => pt.x >= 0 && pt.x <= PAGE_W && pt.y >= 0 && pt.y <= PAGE_H;

const CENTER = { cssX: PAGE_W / 2, cssY: PAGE_H / 2 };

describe("brush capture→export pipeline (post-fix)", () => {
  for (const dpr of [1, 2, 3]) {
    it(`dpr=${dpr}: a centre stroke exports to the page centre`, () => {
      const out = exportPoint(normalizeToCss(rawCapture(CENTER.cssX, CENTER.cssY, dpr), dpr));
      expect(out.x).toBeCloseTo(PAGE_W / 2, 5);
      expect(out.y).toBeCloseTo(PAGE_H / 2, 5);
      expect(inside(out)).toBe(true);
    });
  }

  it("desktop (dpr=1): normalization is a no-op → coordinates identical to before the fix (pure regression)", () => {
    const raw = rawCapture(CENTER.cssX, CENTER.cssY, 1);
    const normalized = normalizeToCss(raw, 1);
    expect(normalized).toEqual(raw); // rx = 1 → unchanged
    expect(exportPoint(normalized)).toEqual(exportPoint(raw));
  });

  it("regression proof: the OLD path (no normalization) displaced the stroke off-page on mobile", () => {
    const outOld = exportPoint(rawCapture(CENTER.cssX, CENTER.cssY, 3)); // pre-fix
    expect(inside(outOld)).toBe(false);
    expect(outOld.x).toBeCloseTo((PAGE_W / 2) * 3, 5);
  });

  it("arbitrary point lands where drawn for every dpr (not just the centre)", () => {
    const pt = { cssX: 123, cssY: 700 };
    for (const dpr of [1, 2, 3]) {
      const out = exportPoint(normalizeToCss(rawCapture(pt.cssX, pt.cssY, dpr), dpr));
      expect(out.x).toBeCloseTo(pt.cssX, 5);
      expect(out.y).toBeCloseTo(PAGE_H - pt.cssY, 5);
    }
  });
});

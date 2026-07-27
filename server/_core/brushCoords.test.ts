import { describe, it, expect } from "vitest";

// CHARACTERIZATION TEST — pins the freehand-brush coordinate contract and proves
// the displacement bug the corruption sweep surfaced (paid docs with ink outside
// the page). It mirrors, byte for byte, the two pieces of PdfEditor.tsx:
//
//  1. Storage (handleCanvasMouseUp:2104 / handleCanvasTouchEnd:2001):
//     brush `points` are stored RAW from getCanvasPos → canvas-INTERNAL pixels,
//     i.e. CSS pixels * devicePixelRatio. (eraser/highlight DO divide by dpr via
//     getCanvasToCssRatios; brush does NOT — that asymmetry is the bug.)
//
//  2. Export (buildAnnotatedPdf:3041): each point becomes a PDF coordinate via
//     `x = px / scale`, `y = pageHeight - py / scale`  — divides by scale only.
//
// On desktop dpr=1 so it round-trips. On mobile dpr=2..3 a leftover ×dpr factor
// throws the stroke far outside the page (the exact "displaced/deformed ink").

const PAGE_W = 595;   // A4 portrait in PDF points
const PAGE_H = 842;
const SCALE = 0.7;    // user was editing at ~60-75% zoom

// (1) how a brush point drawn at CSS position (cssX,cssY) is CURRENTLY stored
const storeRaw = (cssX: number, cssY: number, dpr: number) => ({ x: cssX * SCALE * dpr, y: cssY * SCALE * dpr });
// (1-fixed) how it SHOULD be stored (CSS space, dpr divided out — like eraser/highlight)
const storeFixed = (cssX: number, cssY: number, _dpr: number) => ({ x: cssX * SCALE, y: cssY * SCALE });
// (2) buildAnnotatedPdf export transform (divides by scale only)
const exportPoint = (p: { x: number; y: number }) => ({ x: p.x / SCALE, y: PAGE_H - p.y / SCALE });

const inside = (pt: { x: number; y: number }) => pt.x >= 0 && pt.x <= PAGE_W && pt.y >= 0 && pt.y <= PAGE_H;

// User draws a dot at the visual CENTRE of the page (CSS points = PDF points).
const CENTER = { cssX: PAGE_W / 2, cssY: PAGE_H / 2 };

describe("brush export coordinates", () => {
  it("desktop (dpr=1): centre stroke exports to the page centre — correct", () => {
    const out = exportPoint(storeRaw(CENTER.cssX, CENTER.cssY, 1));
    expect(out.x).toBeCloseTo(PAGE_W / 2, 5);
    expect(out.y).toBeCloseTo(PAGE_H / 2, 5);
    expect(inside(out)).toBe(true);
  });

  it("mobile (dpr=3): the SAME centre stroke lands far OFF the page — the bug", () => {
    const out = exportPoint(storeRaw(CENTER.cssX, CENTER.cssY, 3));
    // x blows up to ~3x page width, y goes deep negative — matches the sweep
    // (e.g. y in [-835..840] on an 842-pt page).
    expect(out.x).toBeCloseTo((PAGE_W / 2) * 3, 5);
    expect(out.y).toBeCloseTo(PAGE_H - (PAGE_H / 2) * 3, 5); // = -421
    expect(inside(out)).toBe(false);
  });

  it("mobile (dpr=2): displacement factor equals the device pixel ratio", () => {
    const out = exportPoint(storeRaw(CENTER.cssX, CENTER.cssY, 2));
    expect(out.x / (PAGE_W / 2)).toBeCloseTo(2, 5);
  });

  it("FIX (store in CSS space, divide dpr out): centre stays centred on mobile", () => {
    for (const dpr of [1, 2, 3]) {
      const out = exportPoint(storeFixed(CENTER.cssX, CENTER.cssY, dpr));
      expect(out.x).toBeCloseTo(PAGE_W / 2, 5);
      expect(out.y).toBeCloseTo(PAGE_H / 2, 5);
      expect(inside(out)).toBe(true);
    }
  });
});

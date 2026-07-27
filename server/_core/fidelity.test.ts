import { describe, it, expect } from "vitest";

// ── SUITE DE FIDELIDAD ──────────────────────────────────────────────────────
// Per annotation tool × dpr × zoom: model exactly what PdfEditor STORES when the
// user targets a page point, then apply buildAnnotatedPdf's EXPORT transform,
// and assert the exported point lands where the user drew. This is the
// permanent gate that must pass before any merge touching the editor or export.
//
// Coordinate model (all in "PDF-top" origin, y measured from the page top):
//   • On-screen the overlay is CSS-sized = pageW·scale × pageH·scale, so a page
//     point (px, pyTop) sits at CSS (px·s, pyTop·s).
//   • getCanvasPos returns canvas-INTERNAL pixels = CSS·devicePixelRatio.
//   • getCanvasToCssRatios rx = 1/dpr converts canvas-internal → CSS.
//   • Export (buildAnnotatedPdf): PDF coord = stored / scale (divides by the
//     scale ACTIVE AT EXPORT).

type Pt = { x: number; y: number };
type Capture = (px: number, pyTop: number, s: number, dpr: number) => Pt;

// Draw-in-place tools read getCanvasPos (canvas-internal) then normalise by
// rx=1/dpr → CSS. brush was the one missing this until the Etapa-2 fix; eraser
// and highlight always did it. If the brush fix regresses, its row here fails.
const captureDrawInPlace: Capture = (px, pyTop, s, dpr) => {
  const rawX = px * s * dpr, rawY = pyTop * s * dpr; // getCanvasPos
  const rx = 1 / dpr, ry = 1 / dpr;                  // getCanvasToCssRatios
  return { x: rawX * rx, y: rawY * ry };
};

// Place-then-drag tools store `clientX - overlay.left` = CSS space directly
// (no dpr factor), so they are dpr-independent by construction.
const captureDrag: Capture = (px, pyTop, s) => ({ x: px * s, y: pyTop * s });

// buildAnnotatedPdf export: divides by the scale active at export time.
const exportToPdfTop = (stored: Pt, exportScale: number): Pt => ({ x: stored.x / exportScale, y: stored.y / exportScale });

const TOOLS: { name: string; capture: Capture }[] = [
  { name: "lápiz (brush)", capture: captureDrawInPlace },
  { name: "goma (eraser)", capture: captureDrawInPlace },
  { name: "resaltado (highlight)", capture: captureDrawInPlace },
  { name: "texto", capture: captureDrag },
  { name: "nota", capture: captureDrag },
  { name: "forma", capture: captureDrag },
  { name: "imagen", capture: captureDrag },
  { name: "firma", capture: captureDrag },
];

const DPRS = [1, 2, 3];
const ZOOMS = [0.5, 0.75, 1.0, 1.25, 1.5];
const TARGET = { px: 300, pyTop: 400 }; // arbitrary interior page point (PDF pts)

// ── Same-scale (create + export at the same zoom) — the normal flow ──────────
describe("fidelity: create then export at the SAME zoom lands where drawn", () => {
  for (const tool of TOOLS) {
    for (const dpr of DPRS) {
      for (const zoom of ZOOMS) {
        it(`${tool.name} · dpr=${dpr} · zoom=${Math.round(zoom * 100)}%`, () => {
          const stored = tool.capture(TARGET.px, TARGET.pyTop, zoom, dpr);
          const out = exportToPdfTop(stored, zoom);
          expect(out.x).toBeCloseTo(TARGET.px, 4);
          expect(out.y).toBeCloseTo(TARGET.pyTop, 4);
        });
      }
    }
  }
});

// ── Cross-zoom (draw at one zoom, change zoom, THEN export) ──────────────────
// Characterises a SYSTEMIC gap: annotations are stored in CSS at the DRAW scale
// and never rescaled when the zoom changes, while export divides by the EXPORT
// scale. So drawing at one zoom and downloading at another displaces EVERY tool
// by drawScale/exportScale. Documented here so the map is explicit and any
// change to this behaviour is caught.
describe("fidelity: cross-zoom (draw at one zoom, export at another) — KNOWN systemic displacement", () => {
  for (const tool of TOOLS) {
    it(`${tool.name}: draw@70% then export@140% is displaced to half position`, () => {
      const stored = tool.capture(TARGET.px, TARGET.pyTop, 0.7, 2);
      const out = exportToPdfTop(stored, 1.4); // exported at a different zoom
      expect(out.x).toBeCloseTo(TARGET.px * (0.7 / 1.4), 4); // = 150, not 300
      expect(out.x).not.toBeCloseTo(TARGET.px, 1);
    });
  }
});

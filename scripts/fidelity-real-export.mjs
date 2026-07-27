// Validates the coordinate audit against a REAL exported PDF: replicates
// buildAnnotatedPdf's exact draw calls for TEXT and DRAWING, exports a real
// PDF, and reads it back with pdf.js to verify CONTENT and POSITION. Confirms
// the brush fix end to end and that text content survives (the "text missing"
// symptom). No DB / network.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
const OPS = pdfjs.OPS;
const H = 842, W = 595;                    // A4 portrait pts
const TARGET = { px: 300, pyTop: 400 };    // where the user "draws"

// Capture models (mirror PdfEditor): drag tools store CSS; draw-in-place tools
// store getCanvasPos·(1/dpr). Pre-fix brush stored getCanvasPos RAW (the bug).
const capDrag = (px, pyt, s) => ({ x: px * s, y: pyt * s });
const capDrawFixed = (px, pyt, s, d) => ({ x: px * s * d * (1 / d), y: pyt * s * d * (1 / d) });
const capDrawBuggy = (px, pyt, s, d) => ({ x: px * s * d, y: pyt * s * d }); // pre-Etapa-2

async function exportPdf({ text, drawingPts }, scale) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const s = scale || 1;
  if (text) { // mirror buildAnnotatedPdf text branch
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const ax = text.stored.x / s, ay = text.stored.y / s, ah = (text.height ?? 20) / s;
    const pdfY = H - ay - ah;
    page.drawText(text.str, { x: ax, y: pdfY + ah / 2, size: 14, font, color: rgb(0, 0, 0) });
  }
  if (drawingPts) { // mirror buildAnnotatedPdf drawing branch
    for (let i = 1; i < drawingPts.length; i++) {
      const p1 = drawingPts[i - 1], p2 = drawingPts[i];
      page.drawLine({ start: { x: p1.x / s, y: H - p1.y / s }, end: { x: p2.x / s, y: H - p2.y / s }, thickness: 3 / s, color: rgb(1, 0, 0) });
    }
  }
  return new Uint8Array(await doc.save());
}

async function readText(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  return tc.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
}
async function inkMaxOverflow(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const opl = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0]; const st = []; let mnX = 1/0, mnY = 1/0, mxX = -1/0, mxY = -1/0, n = 0;
  const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  const ap = (m, x, y) => [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
  for (let i = 0; i < opl.fnArray.length; i++) { const fn = opl.fnArray[i], a = opl.argsArray[i];
    if (fn === OPS.save) st.push(ctm.slice()); else if (fn === OPS.restore) { if (st.length) ctm = st.pop(); }
    else if (fn === OPS.transform) ctm = mul(ctm, a);
    else if (fn === OPS.constructPath) { const co = a[1]; if (Array.isArray(co)) for (let k = 0; k + 1 < co.length; k += 2) { const [ux, uy] = ap(ctm, co[k], co[k+1]); mnX=Math.min(mnX,ux);mnY=Math.min(mnY,uy);mxX=Math.max(mxX,ux);mxY=Math.max(mxY,uy);n++; } } }
  if (!n) return { has: false };
  const ov = Math.max((mxX - W) / W, (mnX < 0 ? -mnX / W : 0), (mxY - H) / H, (mnY < 0 ? -mnY / H : 0));
  return { has: true, mnX: Math.round(mnX), mxX: Math.round(mxX), mnY: Math.round(mnY), mxY: Math.round(mxY), overflow: +ov.toFixed(2) };
}

console.log("=== TEXTO — contenido + posición (mismo zoom) ===");
for (const s of [0.5, 0.75, 1.0, 1.5]) {
  const stored = capDrag(TARGET.px, TARGET.pyTop, s);
  const bytes = await exportPdf({ text: { str: "PRUEBA PARA CLAUDE", stored, height: 20 } }, s);
  const items = await readText(bytes);
  const found = items.find(i => i.str.includes("PRUEBA"));
  const okPos = found && Math.abs(found.x - TARGET.px) < 3 && Math.abs(found.y - (H - TARGET.pyTop - 10)) < 12;
  console.log(`  zoom ${Math.round(s*100)}%: contenido=${found ? "SÍ" : "AUSENTE ✗"} pos x=${found?Math.round(found.x):"—"} y=${found?Math.round(found.y):"—"} → ${okPos ? "OK" : "✗ desplazado"}`);
}

console.log("\n=== LÁPIZ (brush) — dibujo dentro de página (mismo zoom) ===");
const line = (cap, s, d) => [capOf(cap, 250, 380, s, d), capOf(cap, 350, 420, s, d)];
function capOf(cap, px, pyt, s, d) { return cap(px, pyt, s, d); }
for (const d of [1, 2, 3]) {
  const s = 0.7;
  const fixed = await inkMaxOverflow(await exportPdf({ drawingPts: line(capDrawFixed, s, d) }, s));
  const buggy = await inkMaxOverflow(await exportPdf({ drawingPts: line(capDrawBuggy, s, d) }, s));
  console.log(`  dpr=${d}: FIX overflow=${fixed.overflow} ${fixed.overflow<=0?"(dentro) OK":"✗ FUERA"}  |  pre-fix overflow=${buggy.overflow} ${buggy.overflow>0.3?"FUERA (bug confirmado)":""}`);
}
console.log("\nlisto.");

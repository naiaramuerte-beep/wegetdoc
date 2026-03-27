// Simulate the exact edit-text export logic from PdfEditor.tsx
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { writeFileSync } from 'fs';

// Create a test PDF with known text
async function createTestPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  
  page.drawText('Venta', { x: 100, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  page.drawText('Precio: 100', { x: 100, y: 650, size: 14, font, color: rgb(0, 0, 0) });
  
  return doc.save();
}

async function simulatePdfjsLoad(pdfBytes) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) });
  const pdfDoc = await loadingTask.promise;
  const scale = 1.5;
  
  const page = await pdfDoc.getPage(1);
  const vp = page.getViewport({ scale });
  const content = await page.getTextContent();
  
  const pdfPageHeight = vp.height / scale;
  console.log('PDF page height (points):', pdfPageHeight.toFixed(1));
  
  const blocks = [];
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;
    const [a, b, , , e, f] = item.transform;
    const pdfFontSize = Math.sqrt(a * a + b * b);
    const pdfWidth = item.width ?? item.str.length * pdfFontSize * 0.6;
    
    console.log(`"${item.str}": pdfX=${e.toFixed(1)}, pdfY(baseline)=${f.toFixed(1)}, fontSize=${pdfFontSize.toFixed(1)}, width=${pdfWidth.toFixed(1)}`);
    
    blocks.push({
      str: item.str,
      pdfX: e,
      pdfY: f,
      pdfWidth: Math.max(pdfWidth, 10),
      pdfFontSize: Math.max(pdfFontSize, 6),
      page: 1,
    });
  }
  
  return blocks;
}

async function simulateExport(pdfBytes, blocks) {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPage(0);
  
  for (const block of blocks) {
    const editedStr = block.str === 'Venta' ? 'OFERTA' : (block.str === 'Precio: 100' ? 'Precio: 999' : null);
    if (!editedStr) continue;
    
    console.log(`\nEditing: "${block.str}" -> "${editedStr}" at pdfX=${block.pdfX.toFixed(1)}, pdfY=${block.pdfY.toFixed(1)}`);
    
    // Cover original
    page.drawRectangle({
      x: block.pdfX - 2,
      y: block.pdfY - block.pdfFontSize * 0.25,
      width: block.pdfWidth + 4,
      height: block.pdfFontSize * 1.4,
      color: rgb(1, 1, 1),
      opacity: 1,
    });
    
    // Draw new text
    page.drawText(editedStr, {
      x: block.pdfX,
      y: block.pdfY,
      size: block.pdfFontSize,
      font,
      color: rgb(0.8, 0, 0),
    });
  }
  
  return doc.save();
}

async function main() {
  console.log('=== Edit Text Export Test ===\n');
  const pdfBytes = await createTestPdf();
  writeFileSync('/tmp/test-original.pdf', Buffer.from(pdfBytes));
  console.log('Created: /tmp/test-original.pdf\n');
  
  const blocks = await simulatePdfjsLoad(pdfBytes);
  
  const editedBytes = await simulateExport(pdfBytes, blocks);
  writeFileSync('/tmp/test-edited.pdf', Buffer.from(editedBytes));
  console.log('\nCreated: /tmp/test-edited.pdf');
}

main().catch(console.error);

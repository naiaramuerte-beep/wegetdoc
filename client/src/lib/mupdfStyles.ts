/**
 * MuPDF-based text style extraction.
 * Uses MuPDF WASM to get real font names, bold/italic, size, and color
 * for each text block in a PDF page.
 */

export interface TextBlockStyle {
  str: string;
  x: number;
  y: number;
  fontSize: number;
  fontName: string;
  fontFamily: string; // "serif", "sans-serif", "monospace"
  isBold: boolean;
  isItalic: boolean;
  color: string; // hex color e.g. "#8b0000"
}

let mupdfModule: any = null;

async function getMuPDF() {
  if (mupdfModule) return mupdfModule;
  try {
    mupdfModule = await import("mupdf");
    return mupdfModule;
  } catch (err) {
    console.warn("[mupdfStyles] Failed to load MuPDF:", err);
    return null;
  }
}

/**
 * Extract text styles from a PDF page using MuPDF's StructuredText walker.
 * Returns an array of text blocks with real font info, bold/italic, and color.
 */
export async function extractTextStyles(
  pdfBytes: Uint8Array,
  pageNum: number // 0-indexed
): Promise<TextBlockStyle[]> {
  const mupdf = await getMuPDF();
  if (!mupdf) return [];

  try {
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const page = doc.loadPage(pageNum);
    const stext = page.toStructuredText("preserve-whitespace");

    const chars: Array<{
      c: string;
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
      isBold: boolean;
      isItalic: boolean;
      isSerif: boolean;
      color: string;
    }> = [];

    stext.walk({
      onChar(c: string, origin: [number, number], font: any, size: number, quad: any, color: any) {
        // Color can be: [gray], [r,g,b], or [c,m,y,k]
        let r = 0, g = 0, b = 0;
        if (Array.isArray(color)) {
          if (color.length === 1) {
            // Grayscale
            r = g = b = color[0];
          } else if (color.length === 3) {
            // RGB
            [r, g, b] = color;
          } else if (color.length === 4) {
            // CMYK to RGB
            const [cc, mm, yy, kk] = color;
            r = (1 - cc) * (1 - kk);
            g = (1 - mm) * (1 - kk);
            b = (1 - yy) * (1 - kk);
          }
        }
        const hexColor = `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`;
        chars.push({
          c,
          x: origin[0],
          y: origin[1],
          fontSize: size,
          fontName: font.getName() || "unknown",
          isBold: font.isBold(),
          isItalic: font.isItalic(),
          isSerif: font.isSerif(),
          color: hexColor,
        });
      },
    });

    // Group consecutive chars with same style into blocks
    const blocks: TextBlockStyle[] = [];
    let current: {
      chars: string[];
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
      isBold: boolean;
      isItalic: boolean;
      isSerif: boolean;
      color: string;
    } | null = null;

    for (const ch of chars) {
      if (
        current &&
        current.fontName === ch.fontName &&
        current.color === ch.color &&
        Math.abs(current.fontSize - ch.fontSize) < 0.5 &&
        Math.abs(current.y - ch.y) < ch.fontSize * 0.5 // same line
      ) {
        current.chars.push(ch.c);
      } else {
        if (current && current.chars.length > 0) {
          const str = current.chars.join("");
          if (str.trim()) {
            blocks.push({
              str,
              x: current.x,
              y: current.y,
              fontSize: current.fontSize,
              fontName: current.fontName,
              fontFamily: current.isSerif ? "serif" : "sans-serif",
              isBold: current.isBold,
              isItalic: current.isItalic,
              color: current.color,
            });
          }
        }
        current = {
          chars: [ch.c],
          x: ch.x,
          y: ch.y,
          fontSize: ch.fontSize,
          fontName: ch.fontName,
          isBold: ch.isBold,
          isItalic: ch.isItalic,
          isSerif: ch.isSerif,
          color: ch.color,
        };
      }
    }
    // Flush last block
    if (current && current.chars.length > 0) {
      const str = current.chars.join("");
      if (str.trim()) {
        blocks.push({
          str,
          x: current.x,
          y: current.y,
          fontSize: current.fontSize,
          fontName: current.fontName,
          fontFamily: current.isSerif ? "serif" : "sans-serif",
          isBold: current.isBold,
          isItalic: current.isItalic,
          color: current.color,
        });
      }
    }

    // Cleanup
    stext.destroy();
    page.destroy();
    doc.destroy();

    return blocks;
  } catch (err) {
    console.error("[mupdfStyles] Error extracting text styles:", err);
    return [];
  }
}

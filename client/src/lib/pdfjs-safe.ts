/**
 * Historically this module patched `Uint8Array.prototype.toHex / toBase64`
 * and forced main-thread pdfjs execution on Safari, because pdfjs-dist v5+
 * depended on those TC39 methods and crashed inside the worker on older
 * WebKit. The app is now pinned to pdfjs-dist v4.x which doesn't need
 * those patches.
 *
 * Current job: ensure CID-font CMaps are loaded so pdfjs can decode
 * Cyrillic / Greek / CJK / Vietnamese text in PDFs that use composite
 * fonts (very common in Eastern-European and Asian government documents).
 * Without `cMapUrl`, pdfjs falls back to raw byte values and the user
 * sees Latin-1 mojibake ("Ïîãîä…") instead of the original characters.
 *
 * The cmap files (~1.5 MB of `.bcmap` blobs) are copied from
 * `node_modules/pdfjs-dist/cmaps/` to `client/public/cmaps/` so Vite
 * serves them at `/cmaps/`.
 */

export function pdfjsCompatOpts(): { cMapUrl: string; cMapPacked: boolean } {
  return {
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  };
}

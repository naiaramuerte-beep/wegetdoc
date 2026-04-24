/**
 * pdfjs-dist v5+ internally calls `Uint8Array.prototype.toHex()` (TC39
 * proposal — landed in WebKit 18.4 only). Older Safari/iOS crash inside
 * the worker with "toHex is not a function", pdfjs swallows the error,
 * and `getTextContent()` silently returns zero items — so the editor
 * shows "This page has no editable text" for every PDF on Safari.
 *
 * This module has two jobs, applied as side effects of the import:
 *
 * 1. Install polyfills for `Uint8Array.prototype.toHex`, `.setFromHex`,
 *    and the static `Uint8Array.fromHex` on the main thread.
 *
 * 2. Provide `pdfjsCompatOpts()` — spread into every `getDocument()`
 *    call site. On affected Safari versions it returns
 *    `{ disableWorker: true }` so pdfjs parses PDFs in the main thread
 *    where the polyfills above apply. Chromium, Firefox, and modern
 *    Safari (≥ 18.4) keep using the worker for perf.
 *
 * Every module that calls `pdfjsLib.getDocument(...)` must import from
 * this file so the polyfill side effects are guaranteed to have run.
 */

// ── Capture native support BEFORE polyfilling ─────────────────────────
const HAS_NATIVE_TOHEX = typeof (Uint8Array.prototype as any).toHex === "function";

// ── Uint8Array hex polyfills (main thread) ────────────────────────────
if (!HAS_NATIVE_TOHEX) {
  (Uint8Array.prototype as any).toHex = function (this: Uint8Array) {
    return Array.from(this)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };
}

if (typeof (Uint8Array.prototype as any).setFromHex !== "function") {
  (Uint8Array.prototype as any).setFromHex = function (this: Uint8Array, hexString: string) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    this.set(bytes);
    return { read: hexString.length, written: bytes.length };
  };
}

if (typeof (Uint8Array as any).fromHex !== "function") {
  (Uint8Array as any).fromHex = function (hexString: string) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  };
}

// ── Safari fallback detection ─────────────────────────────────────────
// If the browser shipped toHex natively, the worker thread has it too
// and the worker is fine. If we had to polyfill, the worker thread
// still doesn't have it and we must force main-thread execution.
const NEEDS_MAIN_THREAD = !HAS_NATIVE_TOHEX;

/**
 * Merge-in compat options for `pdfjsLib.getDocument()`. Returns
 * `{ disableWorker: true }` on browsers whose worker thread is missing
 * `Uint8Array.prototype.toHex`; `{}` everywhere else.
 */
export function pdfjsCompatOpts(): { disableWorker?: boolean } {
  return NEEDS_MAIN_THREAD ? { disableWorker: true } : {};
}

/**
 * Historically this module patched `Uint8Array.prototype.toHex / toBase64`
 * and forced main-thread pdfjs execution on Safari, because pdfjs-dist v5+
 * depended on those TC39 methods and crashed inside the worker on older
 * WebKit (the proposal only landed in Safari 18.2 / 18.4).
 *
 * The app is now pinned to pdfjs-dist v4.x, which does NOT use those
 * methods at all, so the polyfills and the worker bypass are no longer
 * needed. `pdfjsCompatOpts()` returns `{}` and every call site keeps
 * spreading it for forward compatibility — if we ever jump back to v5+
 * the compat logic can land here again without touching the consumers.
 */

export function pdfjsCompatOpts(): Record<string, never> {
  return {};
}

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
// The TC39 Uint8Array base64/hex proposal shipped in WebKit in two waves:
// toBase64/fromBase64 in Safari 18.2, toHex/fromHex in Safari 18.4.
// Older Safari (and Firefox as of 2026) lack all six. pdfjs-dist v5 uses
// them internally, so if any is missing we must force main-thread
// execution of pdfjs so it sees the polyfilled prototype.
const HAS_NATIVE_TOHEX = typeof (Uint8Array.prototype as any).toHex === "function";
const HAS_NATIVE_TOBASE64 = typeof (Uint8Array.prototype as any).toBase64 === "function";
const HAS_ALL_NATIVE = HAS_NATIVE_TOHEX && HAS_NATIVE_TOBASE64;

// ── Uint8Array hex polyfills (main thread) ────────────────────────────
if (!HAS_NATIVE_TOHEX) {
  (Uint8Array.prototype as any).toHex = function (this: Uint8Array) {
    let out = "";
    for (let i = 0; i < this.length; i++) out += this[i].toString(16).padStart(2, "0");
    return out;
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

// ── Uint8Array base64 polyfills (main thread) ─────────────────────────
if (!HAS_NATIVE_TOBASE64) {
  (Uint8Array.prototype as any).toBase64 = function (this: Uint8Array, opts?: { alphabet?: "base64" | "base64url"; omitPadding?: boolean }) {
    // btoa expects a binary string — build it chunk-wise to stay safe for
    // large arrays (a 1-arg btoa on a big string works, but building the
    // binary string via String.fromCharCode(...arr) hits the arg limit).
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < this.length; i += chunk) {
      binary += String.fromCharCode.apply(null, this.subarray(i, i + chunk) as any);
    }
    let s = btoa(binary);
    if (opts?.alphabet === "base64url") s = s.replace(/\+/g, "-").replace(/\//g, "_");
    if (opts?.omitPadding) s = s.replace(/=+$/, "");
    return s;
  };
}

if (typeof (Uint8Array.prototype as any).setFromBase64 !== "function") {
  (Uint8Array.prototype as any).setFromBase64 = function (this: Uint8Array, base64String: string, opts?: { alphabet?: "base64" | "base64url" }) {
    let s = base64String;
    if (opts?.alphabet === "base64url") s = s.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(s);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    this.set(bytes);
    return { read: base64String.length, written: bytes.length };
  };
}

if (typeof (Uint8Array as any).fromBase64 !== "function") {
  (Uint8Array as any).fromBase64 = function (base64String: string, opts?: { alphabet?: "base64" | "base64url" }) {
    let s = base64String;
    if (opts?.alphabet === "base64url") s = s.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(s);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };
}

// ── Safari fallback detection ─────────────────────────────────────────
// If the browser shipped all six methods natively, the worker thread has
// them too and the worker is fine. If ANY was missing on the main thread
// we polyfilled it here, but the worker has its own global scope and
// won't inherit the patch — force pdfjs onto the main thread there.
const NEEDS_MAIN_THREAD = !HAS_ALL_NATIVE;

/**
 * Merge-in compat options for `pdfjsLib.getDocument()`. Returns
 * `{ disableWorker: true }` on browsers whose worker thread is missing
 * `Uint8Array.prototype.toHex`; `{}` everywhere else.
 */
export function pdfjsCompatOpts(): { disableWorker?: boolean } {
  return NEEDS_MAIN_THREAD ? { disableWorker: true } : {};
}

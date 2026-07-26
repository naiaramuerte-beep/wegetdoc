/**
 * Structural sanity check so we NEVER serve a blank/corrupt PDF to a paying
 * user (the "pagué y está en blanco" complaints).
 *
 * Cheap checks always (size, %PDF header, %%EOF trailer); a full pdf-lib
 * page-count only for reasonably-sized files — blank/corrupt docs are small,
 * and parsing a 100 MB scan on every download is wasteful. Returns ok=false +
 * a machine reason the caller logs; the caller turns that into a clear error
 * (HTTP 422), never empty bytes.
 */
export async function validatePdfBuffer(
  buffer: Buffer,
): Promise<{ ok: boolean; reason?: string; pages?: number }> {
  // A valid 1-page PDF can be ~500 B; keep the cheap floor low and let the
  // page-count parse below be the real "not blank" gate.
  if (!buffer || buffer.length < 400) return { ok: false, reason: "too-small" };
  if (!buffer.subarray(0, 1024).toString("latin1").includes("%PDF")) {
    return { ok: false, reason: "no-header" };
  }
  const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
  if (!tail.includes("%%EOF")) return { ok: false, reason: "no-eof" };
  // Blank/corrupt docs are tiny; only pay the parse cost under 25 MB.
  if (buffer.length < 25 * 1024 * 1024) {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buffer, { updateMetadata: false, ignoreEncryption: true });
      const pages = doc.getPageCount();
      if (pages < 1) return { ok: false, reason: "no-pages" };
      return { ok: true, pages };
    } catch (e: any) {
      return { ok: false, reason: `parse-failed:${String(e?.message ?? "").slice(0, 60)}` };
    }
  }
  return { ok: true };
}

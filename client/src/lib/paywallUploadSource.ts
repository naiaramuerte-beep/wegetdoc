// Single source of truth for WHICH bytes the paywall persists/uploads for the
// editor. There is intentionally NO divergent fallback: a stale snapshot that
// differed from what the user saw once persisted CORRUPTED docs (typed text
// lost, freehand ink relocated). The rule is simple and total:
//
//   - In-editor (the PDF is loaded, pdfBytes present): the live annotated
//     rebuild is authoritative. If the rebuild fails we return null — the caller
//     retries; we NEVER substitute a different doc.
//   - Resume (post-OAuth mobile redirect: the editor was remounted so pdfBytes
//     AND the in-memory annotations are gone): buildAnnotatedPdf cannot
//     reconstruct anything, so persist the EXACT on-screen bytes the user is
//     looking at (pdfDataForPaywall, restored from the temp key) — identical to
//     the preview and the download.
//
// Either way the persisted bytes == what the user sees. Never a third value.

export interface PdfPayload {
  base64: string;
  name: string;
  size: number;
}

export interface PaywallUploadInputs {
  /** The editor has the PDF + live annotations loaded (in-editor, not resume). */
  hasEditorBytes: boolean;
  /** buildAnnotatedPdf() result — only meaningful when hasEditorBytes. */
  rebuilt: PdfPayload | null;
  /** pdfDataForPaywall — the exact bytes rendered in the modal / downloaded. */
  onScreen: PdfPayload | null;
}

export function pickPaywallUploadSource(i: PaywallUploadInputs): PdfPayload | null {
  if (i.hasEditorBytes) {
    // Authoritative live rebuild. Null → caller retries; never a substitute.
    return i.rebuilt ?? null;
  }
  // Resume: the on-screen bytes are the only truthful copy of the edits.
  return i.onScreen ?? null;
}

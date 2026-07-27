// Decides whether the editor should load the ORIGINAL pendingFile as its working
// document when it (re)mounts.
//
// The bug this guards (#0, main money path — Google mobile resume):
// The editor keeps TWO copies across the "register with Google" redirect:
//   • the ORIGINAL, in sessionStorage (savePdfToSession → SESSION_KEY_PDF), and
//   • the EDITED/annotated, uploaded to R2-temp and threaded through the OAuth
//     return URL as `tk` (reliable across the mobile cross-origin round-trip).
// On resume EditorPage passed the ORIGINAL as PdfEditor's `initialFile`, which
// loaded pdfBytes=ORIGINAL while the remount had wiped the in-memory annotations.
// buildPdfForUpload then rebuilt the UNEDITED original (empty annotations), so the
// preview showed the edited temp key but the saved/downloaded doc was the
// original — "sube el original y pierde todas las ediciones".
//
// Rule: when an edited draft is pending (resume), the edited temp key is the sole
// source of truth. Never load the original; leave the editor file-less so
// buildPdfForUpload returns the on-screen (edited) bytes and the close handler
// restores the edited doc.
export function shouldLoadOriginalFile(input: { hasPendingEdited: boolean }): boolean {
  return !input.hasPendingEdited;
}

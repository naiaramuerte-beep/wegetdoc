/**
 * (a) Decide whether to persist the edited (annotated) PDF as a user-linked
 * PENDING document RIGHT NOW — as soon as the user authenticates inside the
 * open paywall, regardless of HOW they authenticated (email, Google popup, or
 * Google mobile full-page redirect).
 *
 * Why: before this, the annotated doc was only saved by the email-register path
 * and by the editor's mount-only resume block. The Google DESKTOP popup path
 * saved nothing (it only called refresh()), so those buyers paid and their doc
 * never reached R2 → "pagué y no hay archivo". This decision fires the save on
 * ANY successful auth, independent of the payment method chosen afterwards.
 *
 * Pure + deterministic so the 6 auth×payment paths are unit-tested.
 */
export interface DraftPersistState {
  /** paywall modal is open */
  isOpen: boolean;
  /** user is now authenticated (just cleared the register gate, any method) */
  isAuthenticated: boolean;
  /** there is annotated content to persist (pdfData OR buildPdfForUpload) */
  hasAnnotated: boolean;
  /** we already attempted the persist for this modal-open */
  alreadyTried: boolean;
  /** the editor already saved a user-linked doc (authenticated editor flow) */
  editorAlreadySaved: boolean;
}

export function shouldPersistDraft(s: DraftPersistState): boolean {
  if (!s.isOpen) return false;
  if (!s.isAuthenticated) return false;
  if (s.alreadyTried) return false;
  if (s.editorAlreadySaved) return false; // already a user-linked doc, don't duplicate
  if (!s.hasAnnotated) return false;
  return true;
}

/**
 * (b) Parse the OAuth-return / 3DS-return query so the editor can RESUME exactly
 * where it was: reopen the paywall with the edited PDF restored from R2 (tk),
 * never bounce to home. `resume=download` is the marker goRedirect appends; `tk`
 * is the temp R2 key of the annotated PDF, `tn` its filename, `doc` the exact
 * saved doc id to serve on the success page (optional).
 */
export interface ResumeParams {
  isResume: boolean;
  tempKey: string | null;
  tempName: string | null;
  docId: number | null;
}

export function parseResumeParams(search: string): ResumeParams {
  const p = new URLSearchParams(search || "");
  const docNum = Number(p.get("doc"));
  return {
    isResume: p.get("resume") === "download",
    tempKey: p.get("tk"),
    tempName: p.get("tn"),
    docId: Number.isFinite(docNum) && docNum > 0 ? docNum : null,
  };
}

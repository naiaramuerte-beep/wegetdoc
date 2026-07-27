// Resolves the R2-temp ticket (tk) for the edited PDF BEFORE the Google
// full-page redirect, with a shield against the footgun proved in
// preRedirectTicket.test.ts:
//
//   Old goRedirect did `await (preUploadRef.current ?? saveEditedPdfToSession())`.
//   A pre-upload that FAILED is a promise RESOLVED TO NULL — still truthy — so the
//   `??` never retried, tk stayed null, the OAuth return URL carried no tk, and
//   the edited draft was unrecoverable on return (empty preview, lost edits).
//
// The shield: take the pre-upload's VALUE (not just its promise); if null, retry
// fresh uploads; NEVER return a redirect-worthy result without a confirmed
// ticket. The caller must NOT redirect when this returns null. Every branch logs
// under [pre-redirect-guard] so a real smoke pinpoints the exact path.

export interface ResumeTicketDeps {
  /** The pre-upload promise kicked off when the modal opened (may resolve to null). */
  preUpload: Promise<string | null> | null;
  /** A fresh upload of the edited PDF, returning its temp key or null. */
  upload: () => Promise<string | null>;
  /** Max fresh retries after the pre-upload yields no ticket. Default 3. */
  maxRetries?: number;
  /** Called before each retry so the UI can show "guardando tu documento…". */
  onSaving?: () => void;
  log?: (msg: string) => void;
}

export async function resolveResumeTicket(d: ResumeTicketDeps): Promise<string | null> {
  const max = d.maxRetries ?? 3;
  // 1. The VALUE of the pre-upload — not just awaiting the (possibly null) promise.
  let tk: string | null = null;
  try {
    tk = await (d.preUpload ?? d.upload());
  } catch {
    tk = null;
  }
  if (tk) {
    d.log?.(`[pre-redirect-guard] ticket from pre-upload: ${tk}`);
    return tk;
  }
  // 2. Retry fresh uploads — never leave without a confirmed ticket.
  for (let attempt = 1; attempt <= max && !tk; attempt++) {
    d.log?.(`[pre-redirect-guard] no ticket — retry ${attempt}/${max}`);
    d.onSaving?.();
    try {
      tk = await d.upload();
    } catch {
      tk = null;
    }
  }
  if (tk) d.log?.(`[pre-redirect-guard] ticket confirmed after retry: ${tk}`);
  else d.log?.(`[pre-redirect-guard] NO ticket after ${max} retries — caller must NOT redirect`);
  return tk;
}

import { describe, it, expect, vi } from "vitest";

// STEP 1 — prove the footgun. Faithful replica of goRedirect's tk resolution in
// PaywallModal.tsx:1543-1544 (the Google mobile-redirect path):
//
//   const tk = await (preUploadRef.current ?? saveEditedPdfToSession(...));
//   if (tk) resumeQs += `&tk=${encodeURIComponent(tk)}&tn=...`;
//
// `preUploadRef.current` is the pre-upload promise kicked off when the modal
// opened: `saveEditedPdfToSession(...).catch(() => null)`. If that upload FAILED
// it is a promise that RESOLVED TO NULL — which is still a truthy object, so the
// `??` does NOT fall through to a fresh upload. The awaited value is null, tk is
// omitted, the OAuth return URL carries no `tk`, and on return the edited draft
// can't be restored → empty preview + lost edits (only Google mobile; email
// needs no temp key because there is no remount).

// Faithful model: the right operand of `??` is only EVALUATED when the left is
// nullish (that's how `??` short-circuits), which is exactly why a resolved-null
// promise blocks the retry.
async function currentGoRedirectTk(
  preUploadRefCurrent: Promise<string | null> | null,
  uploadNow: () => Promise<string | null>,
) {
  const tk = await (preUploadRefCurrent ?? uploadNow());
  const resumeQs = tk
    ? `resume=download&tk=${encodeURIComponent(tk)}&tn=doc.pdf`
    : "resume=download";
  return { tk, resumeQs, hasTk: resumeQs.includes("tk=") };
}

describe("goRedirect tk resolution — CURRENT behavior (footgun)", () => {
  it("pre-upload RESOLVED TO NULL → no tk, and the fresh upload is NEVER attempted", async () => {
    const uploadNow = vi.fn(async () => "temp/would-succeed-on-retry");
    const r = await currentGoRedirectTk(Promise.resolve(null), uploadNow);
    expect(r.tk).toBeNull();
    expect(r.hasTk).toBe(false);              // ← return URL has NO tk → empty preview
    expect(uploadNow).not.toHaveBeenCalled(); // ← the `??` does not retry a resolved-null promise
  });

  it("pre-upload resolved to a key → tk IS appended", async () => {
    const r = await currentGoRedirectTk(Promise.resolve("temp/ok"), vi.fn());
    expect(r.tk).toBe("temp/ok");
    expect(r.hasTk).toBe(true);
  });

  it("no pre-upload started (null ref) → falls through and uploads now", async () => {
    const uploadNow = vi.fn(async () => "temp/now");
    const r = await currentGoRedirectTk(null, uploadNow);
    expect(uploadNow).toHaveBeenCalledOnce();
    expect(r.hasTk).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import { resolveResumeTicket, canOpenResumePaywall } from "@/lib/resumeTicket";

// BARRIER #2 — never open payment on a resume that couldn't recover the edits.
describe("canOpenResumePaywall — block payment for a copy without edits", () => {
  it("editor has the PDF loaded → open (normal in-editor flow)", () => {
    expect(canOpenResumePaywall({ hasEditorBytes: true, recoveredEditedPreview: false })).toBe(true);
  });
  it("edited preview recovered from temp key → open", () => {
    expect(canOpenResumePaywall({ hasEditorBytes: false, recoveredEditedPreview: true })).toBe(true);
  });
  it("neither recovered → BLOCK (no payment for an unedited copy)", () => {
    expect(canOpenResumePaywall({ hasEditorBytes: false, recoveredEditedPreview: false })).toBe(false);
  });
});

// STEP 2 — the shield. Closes the footgun from preRedirectTicket.test.ts: never
// hand the redirect a null ticket in silence.
describe("resolveResumeTicket — never redirect without a confirmed ticket", () => {
  it("pre-upload already has a ticket → return it, no retry", async () => {
    const upload = vi.fn(async () => "temp/fresh");
    const tk = await resolveResumeTicket({ preUpload: Promise.resolve("temp/pre"), upload });
    expect(tk).toBe("temp/pre");
    expect(upload).not.toHaveBeenCalled();
  });

  it("pre-upload RESOLVED TO NULL → retries a fresh upload (the footgun, now shielded)", async () => {
    const upload = vi.fn(async () => "temp/retried");
    const onSaving = vi.fn();
    const tk = await resolveResumeTicket({ preUpload: Promise.resolve(null), upload, onSaving });
    expect(tk).toBe("temp/retried");        // ← recovered instead of dropping the ticket
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onSaving).toHaveBeenCalledTimes(1); // ← "guardando tu documento…" shown
  });

  it("pre-upload threw → still retries", async () => {
    const upload = vi.fn(async () => "temp/after-throw");
    const tk = await resolveResumeTicket({ preUpload: Promise.reject(new Error("net")), upload });
    expect(tk).toBe("temp/after-throw");
  });

  it("no pre-upload started (null) → uploads now", async () => {
    const upload = vi.fn(async () => "temp/now");
    const tk = await resolveResumeTicket({ preUpload: null, upload });
    expect(tk).toBe("temp/now");
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("upload keeps failing → returns null after maxRetries (caller MUST NOT redirect)", async () => {
    const upload = vi.fn(async () => null);
    const tk = await resolveResumeTicket({ preUpload: Promise.resolve(null), upload, maxRetries: 3 });
    expect(tk).toBeNull();                   // ← never a ticketless "success"
    expect(upload).toHaveBeenCalledTimes(3); // ← retried the full budget
  });

  it("recovers on the LAST allowed retry", async () => {
    let n = 0;
    const upload = vi.fn(async () => (++n >= 3 ? "temp/last" : null));
    const tk = await resolveResumeTicket({ preUpload: Promise.resolve(null), upload, maxRetries: 3 });
    expect(tk).toBe("temp/last");
  });
});

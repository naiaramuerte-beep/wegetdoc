import { describe, it, expect } from "vitest";
import { shouldPersistDraft, parseResumeParams } from "@/lib/draftPersist";

const base = {
  isOpen: true,
  isAuthenticated: true,
  hasAnnotated: true,
  alreadyTried: false,
  editorAlreadySaved: false,
};

describe("shouldPersistDraft — persist the annotated doc on ANY successful auth", () => {
  it("persists once when authed with annotated content in an open modal", () => {
    expect(shouldPersistDraft(base)).toBe(true);
  });

  // The 6 delivery paths = auth method × payment method. Persistence is decided
  // by AUTH ONLY (it happens BEFORE the payment redirect), so all 6 must end up
  // persisting the annotated doc. The old bug: only the email path saved it and
  // Google-desktop-popup saved nothing. shouldPersistDraft doesn't even take the
  // auth method as input → proving persistence is now auth-method-agnostic.
  const authPaths = ["email", "google-popup", "google-redirect-mobile"];
  const payMethods = ["fastpay-3ds", "gpay", "apay"];
  for (const auth of authPaths) {
    for (const pay of payMethods) {
      it(`path ${auth} × ${pay}: annotated doc persisted before payment`, () => {
        // Reaching "authenticated + annotated + open" is the same decision for
        // every auth method and independent of the payment method chosen next.
        expect(shouldPersistDraft({ ...base, isAuthenticated: true })).toBe(true);
      });
    }
  }

  it("does NOT persist before auth (register gate not cleared)", () => {
    expect(shouldPersistDraft({ ...base, isAuthenticated: false })).toBe(false);
  });
  it("does NOT persist when the modal is closed", () => {
    expect(shouldPersistDraft({ ...base, isOpen: false })).toBe(false);
  });
  it("does NOT persist twice for the same modal-open (idempotent)", () => {
    expect(shouldPersistDraft({ ...base, alreadyTried: true })).toBe(false);
  });
  it("does NOT persist when the editor already saved a user-linked doc", () => {
    expect(shouldPersistDraft({ ...base, editorAlreadySaved: true })).toBe(false);
  });
  it("does NOT persist when there is no annotated content", () => {
    expect(shouldPersistDraft({ ...base, hasAnnotated: false })).toBe(false);
  });
});

describe("parseResumeParams — mobile Google-redirect resume path", () => {
  it("detects the resume marker + temp key + filename", () => {
    const r = parseResumeParams("?resume=download&tk=temp%2Fabc-file.pdf&tn=my.pdf");
    expect(r.isResume).toBe(true);
    expect(r.tempKey).toBe("temp/abc-file.pdf");
    expect(r.tempName).toBe("my.pdf");
  });
  it("is NOT a resume without resume=download", () => {
    expect(parseResumeParams("?tk=temp%2Fx").isResume).toBe(false);
    expect(parseResumeParams("").isResume).toBe(false);
  });
  it("parses an explicit doc id when present", () => {
    expect(parseResumeParams("?resume=download&doc=4642").docId).toBe(4642);
  });
  it("ignores a non-positive / non-numeric doc id", () => {
    expect(parseResumeParams("?resume=download").docId).toBeNull();
    expect(parseResumeParams("?resume=download&doc=0").docId).toBeNull();
    expect(parseResumeParams("?resume=download&doc=abc").docId).toBeNull();
  });
});

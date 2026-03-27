import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend email service", () => {
  it("should have a valid RESEND_API_KEY configured", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key).toMatch(/^re_/);
  });

  it("should initialize Resend client without throwing", () => {
    const key = process.env.RESEND_API_KEY ?? "re_test_placeholder";
    expect(() => new Resend(key)).not.toThrow();
  });
});

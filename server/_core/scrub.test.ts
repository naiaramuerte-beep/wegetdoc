import { describe, it, expect } from "vitest";
import { scrubSensitive, isSensitiveKey, luhnValid, maskPansInString } from "./scrub";

describe("scrub — PCI hygiene for persisted callback payloads", () => {
  it("masks a real (Luhn-valid) PAN to last 4", () => {
    // 4111 1111 1111 1111 is the canonical Luhn-valid Visa test number.
    expect(maskPansInString("pan=4111111111111111")).toBe("pan=****1111");
    expect(maskPansInString("card 4111 1111 1111 1111 ok")).toBe("card ****1111 ok");
  });

  it("does NOT mask order timestamps / request ids (not Luhn-valid)", () => {
    const order = "sipay-82786-1785484055340";
    expect(maskPansInString(order)).toBe(order);
    const reqId = "6a6c5318a7cf7d9571b917de";
    expect(maskPansInString(reqId)).toBe(reqId);
  });

  it("leaves already-masked cards untouched (asterisks break the digit run)", () => {
    const masked = "4752 11** ****7267";
    expect(maskPansInString(masked)).toBe(masked);
  });

  it("redacts sensitive keys regardless of value", () => {
    const scrubbed = scrubSensitive({
      order: "sipay-1-2",
      cvv: "123",
      cvv2: "999",
      cryptogram: "ABCcryptoDEF",
      pin: "0000",
      cardNumber: "4111111111111111",
      expiry: "12/29",
      code: "190",
      error: "Operation not authenticated",
    });
    expect(scrubbed.cvv).toBe("[redacted]");
    expect(scrubbed.cvv2).toBe("[redacted]");
    expect(scrubbed.cryptogram).toBe("[redacted]");
    expect(scrubbed.pin).toBe("[redacted]");
    expect((scrubbed as any).cardNumber).toBe("[redacted]");
    expect(scrubbed.expiry).toBe("[redacted]");
    // Non-sensitive fields survive so the KO reason stays diagnosable.
    expect(scrubbed.order).toBe("sipay-1-2");
    expect(scrubbed.code).toBe("190");
    expect(scrubbed.error).toBe("Operation not authenticated");
  });

  it("does not false-positive on ordinary keys", () => {
    expect(isSensitiveKey("shipping")).toBe(false); // contains 'pin' as substring
    expect(isSensitiveKey("mapping")).toBe(false);
    expect(isSensitiveKey("order")).toBe(false);
    expect(isSensitiveKey("transaction_id")).toBe(false);
    expect(isSensitiveKey("cvv")).toBe(true);
    expect(isSensitiveKey("card_number")).toBe(true);
    expect(isSensitiveKey("Ds_Cryptogram")).toBe(true);
  });

  it("recurses into nested objects and arrays + masks embedded PANs", () => {
    const out = scrubSensitive({ a: { b: [{ note: "pay 4111111111111111 now" }] }, cvc: "111" });
    expect(out.a.b[0].note).toBe("pay ****1111 now");
    expect((out as any).cvc).toBe("[redacted]");
  });

  it("luhnValid basics", () => {
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("1785484055340")).toBe(false);
    expect(luhnValid("123")).toBe(false); // too short
  });
});

// PCI hygiene for anything we persist from an uncontrolled source (e.g. the
// Redsys/Sipay browser POST to /api/sipay/callback/ko). We must NEVER store card
// data — PAN, CVV/CVC, cryptogram, PIN, track data — in webhook_events.
//
// Two layers:
//  1) Key redaction — any field whose name looks like card data → "[redacted]".
//  2) Value masking — any 13–19 digit run that passes the Luhn check (i.e. a real
//     card number) is masked to ****<last4>, regardless of the field name. The
//     Luhn gate avoids false positives on order timestamps / request ids (a
//     13-digit epoch almost never passes Luhn).

const EXACT_KEYS = new Set([
  "pan", "cvv", "cvc", "cvn", "cvv2", "cav", "cvid", "pin", "pinblock",
  "track", "track1", "track2", "cardnumber", "cardno", "ccnum", "cardpan",
  "expiry", "expiration", "expdate", "caducidad", "fechacaducidad",
  "securitycode", "cryptogram", "magstripe",
]);
const SUBSTR_KEYS = ["cardnumber", "cryptogram", "securitycode", "expir", "cardpan", "magstripe"];

function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSensitiveKey(k: string): boolean {
  const key = normKey(k);
  if (EXACT_KEYS.has(key)) return true;
  return SUBSTR_KEYS.some((t) => key.includes(t));
}

export function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function maskPansInString(s: string): string {
  // Runs of 13–19 digits, optionally separated by single spaces or dashes.
  return s.replace(/\d(?:[ -]?\d){12,18}/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (!luhnValid(digits)) return m;
    return `****${digits.slice(-4)}`;
  });
}

export function scrubSensitive<T>(v: T, depth = 0): T {
  if (depth > 8) return "[depth]" as unknown as T;
  if (v == null) return v;
  if (typeof v === "string") return maskPansInString(v) as unknown as T;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => scrubSensitive(x, depth + 1)) as unknown as T;
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? "[redacted]" : scrubSensitive(val, depth + 1);
    }
    return out as unknown as T;
  }
  return v;
}

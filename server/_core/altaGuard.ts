/**
 * Shared entry guard for the three signup (alta) charge paths — card/FastPay,
 * Google Pay and Apple Pay.
 *
 * It answers two questions that, until 2026-08-08, nobody asked before taking
 * a customer's money:
 *
 *   1. Has this user already paid for their signup? (idempotency)
 *   2. How much are we actually supposed to charge? (server-side price)
 *
 * Both were client-trusted before. The audit of 2026-08-07 found 25 users
 * charged 2-3 times (28 extra charges, 14,00 €, none refunded), and the amount
 * came straight from the browser with no server check at all.
 *
 * Keeping this in ONE place matters: three near-identical checkout procedures
 * are exactly how the original bug survived — a fix applied to two of them
 * would have left the third leaking.
 */

import { acquireAltaLock, type AltaLockHandle } from "./altaLock";

/**
 * How far back a successful alta charge blocks a new one.
 *
 * Chosen from production data, not from a hunch. Every real accidental
 * duplicate sat between 54 s and 43 min apart. Every legitimate repurchase —
 * a lapsed user signing up again — was at least 2,9 DAYS later. Nothing fell
 * in between, so any window inside that gap separates the two cleanly. Two
 * hours sits in the middle with a wide margin on both sides.
 */
export const ALTA_DUPLICATE_WINDOW_MIN = 120;

export type AltaGuardBlocked = {
  ok: false;
  /** A charge for this user is mid-flight right now (double-tap). */
  reason: "in_flight" | "already_paid";
  /** Present for `already_paid` — lets the caller answer with the real charge. */
  existing?: {
    id: number;
    provider: string;
    amountCents: number;
    sipayTransactionId: string | null;
    sipayOrder: string | null;
    sipayMaskedCard: string | null;
    createdAt: Date;
  } | null;
};

export type AltaGuardOpen = {
  ok: true;
  /** Authoritative amount to charge, in cents. Never comes from the client. */
  amountCents: number;
  /** MUST be called in a `finally`. */
  release: () => void;
};

export type AltaGuardResult = AltaGuardOpen | AltaGuardBlocked;

/**
 * Take the alta lock, verify the user hasn't already paid, and resolve the
 * price from `site_settings`.
 *
 * On success the caller owns a lock and MUST release it in a `finally`. On
 * failure nothing is held, so the caller can return early without cleanup.
 */
export async function openAltaGuard(userId: number): Promise<AltaGuardResult> {
  // Order matters. Take the in-process lock FIRST: if two requests race, only
  // one gets past this line, so only one can reach the (slower) DB probe and
  // the Sipay authorization behind it.
  const lock: AltaLockHandle | null = acquireAltaLock(userId);
  if (!lock) return { ok: false, reason: "in_flight" };

  try {
    const { findRecentAltaCharge, getIntroPriceCents } = await import("../db");
    const existing = await findRecentAltaCharge(userId, ALTA_DUPLICATE_WINDOW_MIN);
    if (existing) {
      lock.release();
      return { ok: false, reason: "already_paid", existing };
    }
    const amountCents = await getIntroPriceCents();
    return { ok: true, amountCents, release: () => lock.release() };
  } catch (err) {
    // Never leave the lock held on an unexpected failure — a user who hits a
    // transient DB error must still be able to pay on their next attempt.
    lock.release();
    throw err;
  }
}

/**
 * Log a blocked signup attempt so duplicates stay visible after the fix.
 *
 * Without this the fix is invisible: we would stop double-charging and also
 * stop being able to tell how often users try. `alta_duplicate_blocked` in
 * `webhook_events` is the counter that says how much money the guard saved.
 */
export async function recordAltaBlocked(opts: {
  userId: number;
  method: "fastpay" | "gpay" | "apay";
  reason: "in_flight" | "already_paid";
  existingChargeId?: number | null;
  clientAmountCents?: number;
}): Promise<void> {
  try {
    const { recordWebhookEvent } = await import("../db");
    await recordWebhookEvent({
      provider: "sipay",
      eventType: "alta_duplicate_blocked",
      eventId: `blocked-${opts.userId}-${Date.now()}`,
      status: "ok",
      durationMs: 0,
      payload: {
        userId: opts.userId,
        method: opts.method,
        reason: opts.reason,
        existingChargeId: opts.existingChargeId ?? null,
        clientAmountCents: opts.clientAmountCents ?? null,
      },
    });
  } catch {
    // Telemetry must never break a payment path.
  }
}

/**
 * Log a client/server price disagreement.
 *
 * The client no longer decides the amount, but it still SENDS one. If the two
 * ever diverge it means either a stale cached bundle or someone poking at the
 * API — both worth seeing. Logged, never fatal: the server amount wins and the
 * customer's checkout completes normally.
 */
export async function recordAltaPriceMismatch(opts: {
  userId: number;
  method: "fastpay" | "gpay" | "apay";
  clientAmountCents: number;
  serverAmountCents: number;
}): Promise<void> {
  try {
    const { recordWebhookEvent } = await import("../db");
    await recordWebhookEvent({
      provider: "sipay",
      eventType: "alta_price_mismatch",
      eventId: `pricemismatch-${opts.userId}-${Date.now()}`,
      status: "error",
      errorMessage: `client=${opts.clientAmountCents} server=${opts.serverAmountCents}`,
      durationMs: 0,
      payload: opts,
    });
  } catch {
    // Telemetry must never break a payment path.
  }
}

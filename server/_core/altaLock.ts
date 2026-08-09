/**
 * Per-user in-flight lock for the signup (alta) charge.
 *
 * WHY THIS EXISTS
 * The audit of 2026-08-07 found 25 users charged 2-3 times for the same alta
 * (28 extra charges, 14,00 €). None of the three checkout paths asked whether
 * the user had already paid before authorizing again.
 *
 * The primary defence is the DB probe (`findRecentAltaCharge`): if a successful
 * alta charge already exists for this user, don't charge again. But that probe
 * can only see charges that have already been WRITTEN, and authorizing at Sipay
 * takes a few seconds. Two requests that arrive inside that window both read an
 * empty ledger and both charge.
 *
 * This module closes exactly that window: a user can have at most one alta
 * charge in flight at a time. It is a mutual-exclusion latch, not a queue —
 * the second caller is rejected immediately rather than waiting, because the
 * correct UX for a double-tap is "you already have one in progress", not
 * "silently charge you again once the first finishes".
 *
 * SCOPE / LIMITATION
 * In-process, so it protects a single Node process. Railway currently runs one
 * replica of the web service, which makes this sufficient today. If the service
 * is ever scaled horizontally this stops covering the sub-second case and the
 * DB probe becomes the only defence — which still catches everything from
 * ~2 s apart onward, i.e. every duplicate we have actually observed in
 * production (the closest real pair was 54 s). Documented rather than
 * over-engineered: moving it to a DB/Redis lock is a bigger change than the
 * residual risk justifies.
 */

/** userId → epoch ms when the in-flight charge started. */
const inFlight = new Map<number, number>();

/**
 * Safety valve. If a charge path throws in a way that skips its `release`, the
 * user would be locked out of paying forever. Any entry older than this is
 * treated as stale and overwritten. Comfortably longer than a Sipay
 * authorization (seconds) and shorter than a user's patience.
 */
const STALE_MS = 90_000;

export type AltaLockHandle = { release: () => void };

/**
 * Try to take the alta lock for a user.
 *
 * Returns a handle whose `release()` MUST be called in a `finally` block, or
 * `null` when another charge for the same user is already in flight.
 */
export function acquireAltaLock(userId: number): AltaLockHandle | null {
  const now = Date.now();
  const startedAt = inFlight.get(userId);
  if (startedAt !== undefined && now - startedAt < STALE_MS) return null;
  inFlight.set(userId, now);
  let released = false;
  return {
    release() {
      // Idempotent: a double release must not free a lock taken by a later
      // request that legitimately acquired it after ours expired.
      if (released) return;
      released = true;
      if (inFlight.get(userId) === now) inFlight.delete(userId);
    },
  };
}

/** Test/diagnostic helper — number of charges currently in flight. */
export function inFlightCount(): number {
  const now = Date.now();
  let n = 0;
  // forEach rather than for..of: the project's TS target predates
  // downlevelIteration, so iterating a Map directly does not compile.
  inFlight.forEach((startedAt) => { if (now - startedAt < STALE_MS) n++; });
  return n;
}

/** Test helper — drop all state. Never called in production code. */
export function __resetAltaLocks(): void {
  inFlight.clear();
}

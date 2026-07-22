/**
 * Sipay client (Phase 0 — sandbox only).
 *
 * Sipay is the Spanish PSP that sits in front of Redsys. The API is documented
 * at developer.sipay.es. All requests share the same wrapper shape:
 *
 *   {
 *     key:      <merchant key, public>,
 *     resource: <merchant resource, public>,
 *     nonce:    <unix ms, replay protection>,
 *     mode:     "sha256",
 *     payload:  { ...operation-specific fields }
 *   }
 *
 * The signature itself is not documented in the public web docs (JS-rendered
 * pages don't expose it through curl), but the `mode` field + standard PSP
 * patterns make HMAC-SHA256 of the JSON body with `secret` the most likely
 * scheme. We send it in BOTH the Authorization header and an X-Signature
 * header so the integration team can confirm which one Sipay reads when we
 * fire the sandbox probe. If Sipay rejects with a signature error we'll
 * iterate on the format in one pass.
 */

import crypto from "crypto";
import { ENV } from "./env";

type SipayWrapper = {
  key: string;
  resource: string;
  nonce: string;
  mode: "sha256";
  payload: Record<string, unknown>;
};

export type SipayResult<T = Record<string, unknown>> = {
  ok: boolean;
  httpStatus: number;
  data: T | null;
  raw: string;
  endpoint: string;
  requestBody: string;
  signature: string;
};

function assertConfigured() {
  if (!ENV.sipayKey || !ENV.sipaySecret || !ENV.sipayResource) {
    throw new Error(
      "Sipay no está configurado. Faltan SIPAY_KEY / SIPAY_SECRET / SIPAY_RESOURCE."
    );
  }
}

function sign(input: string): string {
  return crypto
    .createHmac("sha256", ENV.sipaySecret)
    .update(input)
    .digest("hex");
}

async function sipayPost<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>
): Promise<SipayResult<T>> {
  assertConfigured();

  const wrapper: SipayWrapper = {
    key: ENV.sipayKey,
    resource: ENV.sipayResource,
    nonce: Date.now().toString(),
    mode: "sha256",
    payload,
  };
  const requestBody = JSON.stringify(wrapper);
  // Sipay's signing recipe (per their tech support):
  //   sig = HMAC-SHA256(secret, body)  with body = raw bytes, no trailing \n
  //   header: Content-Signature: <hex>
  // We were already hashing the right input with the right algorithm — the
  // missing piece was the header name. Authorization/X-Signature were ignored.
  const signature = sign(requestBody);
  const endpoint = `${ENV.sipayEndpoint}${path}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Signature": signature,
    },
    body: requestBody,
  });
  const raw = await res.text();
  let data: T | null = null;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    /* not JSON */
  }
  return {
    ok: res.ok,
    httpStatus: res.status,
    data,
    raw,
    endpoint,
    requestBody,
    signature,
  };
}

/**
 * Diagnostic — does a stored token resolve to a saved, chargeable card?
 * Calls /mdwr/v1/card, which does NOT move money. Use it to confirm a wallet
 * sub's `usr-<userId>` token is valid for MIT-R renewal WITHOUT charging.
 * Sipay returns code "0" + card detail when the token resolves; an error like
 * `no_card_from_token` when it doesn't (e.g. legacy cof_id tokens).
 */
export async function checkCardToken(token: string): Promise<SipayResult> {
  return sipayPost("/mdwr/v1/card", { token });
}

/**
 * Initial payment + card tokenization (intro 0,50 € flow).
 * Returns a redirect URL for 3DS authentication; the customer must visit it,
 * Redsys MPI runs the challenge, and they bounce back to url_ok / url_ko.
 */
export function createPaymentWithTokenization(opts: {
  amountCents: number;
  currency?: string;
  pan: string;
  month: string;
  year: string;
  cvv: string;
  token: string;
  order: string;
  url_ok: string;
  url_ko: string;
  custom_01?: string;
  custom_02?: string;
}) {
  // Field order matters because Sipay signs the JSON byte representation.
  // Order confirmed by Sipay support: amount → currency → pan → month → year
  // → cvv → token → operation → url_ok → order. url_ko ends up at the tail
  // (Sipay didn't include it in the canonical list).
  return sipayPost("/mdwr/v1/all-in-one", {
    amount: String(opts.amountCents),
    currency: opts.currency ?? "EUR",
    pan: opts.pan,
    month: opts.month,
    year: opts.year,
    cvv: opts.cvv,
    token: opts.token,
    operation: "all-in-one",
    url_ok: opts.url_ok,
    order: opts.order,
    url_ko: opts.url_ko,
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
}

/**
 * Step 2 after the customer comes back from 3DS via url_ok?request_id=...
 * Confirms the authorization. Response includes transaction_id and masked_card.
 */
export function confirmPayment(requestId: string) {
  return sipayPost("/mdwr/v1/all-in-one/confirm", { request_id: requestId });
}

/**
 * Idempotent finalize for a FastPay payment. Used by BOTH the /api/sipay/callback/ok
 * redirect handler and the reconciliation cron. Why two callers: the redirect
 * fires only if the user makes it back from Redsys MPI with their tab open and
 * a working network — orphan charges (Sipay collected money, we have no DB row)
 * happen when that redirect never lands. The cron sweeps pending 3DS events and
 * re-runs this helper for any request_id whose intro_charge event is missing.
 *
 * Idempotency:
 *  - Reads webhook_events for an existing `fastpay_intro_charge` with the same
 *    eventId (txn or order). If present, returns early — already done.
 *  - upsertSubscription updates the latest sub for that userId rather than
 *    inserting duplicates, so re-running on a manually-recovered orphan
 *    overwrites placeholder values with the real Sipay token/masked card.
 */
export async function finalizeFastpayPayment(opts: {
  requestId: string;
  fallbackUserId?: number;
  source: "callback" | "cron" | "admin";
  acceptLang?: string;
  deviceType?: "mobile" | "desktop" | null;
}): Promise<{
  ok: boolean;
  alreadyFinalized: boolean;
  userId: number;
  txn: string;
  order: string;
  errorMessage?: string;
}> {
  const { requestId, fallbackUserId, source, acceptLang } = opts;
  const startedAt = Date.now();

  const {
    upsertSubscription,
    markDocumentsPaid,
    recordWebhookEvent,
    recordCharge,
    getUserById,
    findIntroChargeForRequest,
    findUserIdFromPendingEvent,
    findGclidFromPendingEvent,
    findLangFromPendingEvent,
  } = await import("../db");

  const result = await confirmPayment(requestId);
  const data = result.data as any;

  if (!result.ok || data?.code !== "0") {
    await recordWebhookEvent({
      provider: "sipay",
      eventType: "fastpay_confirm_failed",
      eventId: requestId,
      status: "error",
      errorMessage: data?.detail ?? data?.description ?? "unknown",
      durationMs: Date.now() - startedAt,
      payload: { source, response: data ?? result.raw },
    });
    return { ok: false, alreadyFinalized: false, userId: 0, txn: "", order: "", errorMessage: data?.detail ?? "confirm_failed" };
  }

  const sipayTxn: string = data?.payload?.transaction_id ?? "";
  const order: string = data?.payload?.order ?? requestId;
  const masked: string = data?.payload?.masked_card ?? "";
  // The reusable card token Sipay charges for MIT-R is the MERCHANT token we
  // set at tokenization (`usr-<userId>`), echoed back here as `payload.token`.
  // The `cof_id` is NOT a chargeable card token (Sipay /mdwr/v1/card rejects
  // it), so the old `cof_id ?? token` order broke every renewal. Prefer the
  // merchant token; a deterministic `usr-<userId>` fallback is set below once
  // we've resolved the userId, in case Sipay didn't echo it.
  let sipayToken: string = data?.payload?.token ?? "";
  const txn = sipayTxn || order;

  // userId resolution waterfall: Sipay's custom_01 → caller's fallback →
  // lookup in our fastpay_3ds_pending log by order/requestId. Earlier
  // orphans happened because we only trusted custom_01 and bailed silently
  // when Sipay didn't echo it back. The lookup-from-pending-event branch
  // catches that case using data we ALREADY wrote at init time.
  let customUserId = Number(data?.payload?.custom_01 ?? 0);
  if (customUserId <= 0 && fallbackUserId && fallbackUserId > 0) {
    customUserId = fallbackUserId;
  }
  if (customUserId <= 0) {
    const fromPending = await findUserIdFromPendingEvent({ order, requestId });
    if (fromPending > 0) customUserId = fromPending;
  }

  if (customUserId <= 0) {
    // Loud failure — silent skip caused the huzinafranciska orphan. Log
    // explicitly so the admin Webhooks tab + cron retries surface it.
    await recordWebhookEvent({
      provider: "sipay",
      eventType: "fastpay_userid_missing",
      eventId: sipayTxn || order,
      status: "error",
      errorMessage: `Sipay confirm ok but no userId found (custom_01 empty, no fallback, no pending event)`,
      durationMs: Date.now() - startedAt,
      payload: { source, order, requestId, sipayTxn, raw: data },
    });
    return { ok: false, alreadyFinalized: false, userId: 0, txn, order, errorMessage: "userid_missing" };
  }

  // Deterministic fallback: if Sipay didn't echo the merchant token, rebuild
  // it from the userId — it's exactly what sipayCheckoutInit set at tokenization
  // (`usr-<userId>`), and what /mdwr/v1/card resolves to the stored card.
  if (!sipayToken && customUserId > 0) sipayToken = `usr-${customUserId}`;

  const already = await findIntroChargeForRequest({ order, sipayTxn, requestId });
  if (already) {
    return { ok: true, alreadyFinalized: true, userId: customUserId, txn, order };
  }

  const now = new Date();
  const TRIAL_DAYS = 2;
  const periodEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await upsertSubscription({
    userId: customUserId,
    sipayToken,
    sipayOrder: order,
    sipayTransactionId: sipayTxn,
    sipayMaskedCard: masked,
    sipayProvider: "fastpay",
    plan: "trial",
    status: "trialing",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  });
  await markDocumentsPaid(customUserId);
  const amountCents = Number(data?.payload?.amount ?? 50);
  // Google Ads click ID for server-side conversion import — stashed in the
  // fastpay_3ds_pending event at init time (survives the 3DS redirect).
  const pendingGclid = await findGclidFromPendingEvent({ order, requestId });
  await recordCharge({
    userId: customUserId,
    provider: "fastpay",
    amountCents,
    sipayTransactionId: sipayTxn,
    sipayOrder: order,
    sipayMaskedCard: masked,
    status: "ok",
    gclid: pendingGclid?.gclid,
    gclidType: pendingGclid?.gclidType,
    deviceType: opts.deviceType ?? null,
  });
  await recordWebhookEvent({
    provider: "sipay",
    eventType: "fastpay_intro_charge",
    eventId: sipayTxn || order,
    status: "ok",
    durationMs: Date.now() - startedAt,
    payload: { source, response: data },
  });

  try {
    const u = await getUserById(customUserId);
    if (u?.email) {
      // Prefer the site language the user was browsing (stashed at checkout
      // init), then the browser Accept-Language, then Spanish.
      const langFromPage = await findLangFromPendingEvent({ order, requestId });
      const lang = langFromPage || (acceptLang ?? "").split(",")[0]?.split("-")[0] || "es";
      const { sendTrialWelcomeEmail } = await import("../email");
      sendTrialWelcomeEmail({ to: u.email, name: u.name ?? u.email, lang, trialEndDate: periodEnd })
        .catch((err: any) => console.warn("[Sipay] welcome email failed:", err?.message ?? err));
    }
  } catch (err: any) {
    console.warn("[Sipay] welcome email setup failed:", err?.message ?? err);
  }

  return { ok: true, alreadyFinalized: false, userId: customUserId, txn, order };
}

/**
 * Initial payment + tokenization using a FastPay-captured card. The PAN never
 * touches our backend — the customer enters it in the FastPay iframe and we
 * receive a 5-min token (`fastpayRequestId`). This is the path that works
 * without PCI-DSS, so it is the one wired into the production paywall.
 */
export function createCheckoutFastpay(opts: {
  amountCents: number;
  fastpayRequestId: string;
  token: string;
  order: string;
  url_ok: string;
  url_ko: string;
  currency?: string;
  custom_01?: string;
  custom_02?: string;
}) {
  // Same canonical field order Sipay uses for the PAN flow, with `fastpay`
  // taking the slot where pan/month/year/cvv would go.
  return sipayPost("/mdwr/v1/all-in-one", {
    amount: String(opts.amountCents),
    currency: opts.currency ?? "EUR",
    fastpay: { request_id: opts.fastpayRequestId },
    token: opts.token,
    operation: "all-in-one",
    url_ok: opts.url_ok,
    order: opts.order,
    url_ko: opts.url_ko,
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
}

/**
 * Recurring charge against a previously tokenized card. MIT (no customer
 * present), reason "R" = recurring. Used by the monthly cron.
 */
export async function createMITRecurring(opts: {
  amountCents: number;
  currency?: string;
  token: string;
  order: string;
  custom_01?: string;
  custom_02?: string;
}): Promise<SipayResult> {
  const init = await sipayPost("/mdwr/v1/all-in-one", {
    amount: String(opts.amountCents),
    currency: opts.currency ?? "EUR",
    operation: "all-in-one",
    token: opts.token,
    order: opts.order,
    sca_exemptions: "MIT",
    reason: "R",
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
  // Sipay's MIT-R is a TWO-step flow. The all-in-one above does NOT capture —
  // it returns detail:"authentication_started" + a request_id. The actual
  // authorization only happens when we confirm that request_id. Because it's a
  // merchant-initiated transaction (sca_exemptions:"MIT") no real 3DS/customer
  // interaction is needed — confirm completes server-to-server. Skipping this
  // step made the cron see code:"0" and record a phantom charge while taking
  // no money. We chain the confirm here so callers get the final result.
  const initData = init.data as any;
  const requestId = initData?.payload?.request_id;
  if (init.ok && initData?.code === "0" && requestId) {
    return await confirmPayment(requestId);
  }
  return init;
}

export function refundPayment(opts: {
  amountCents: number;
  currency?: string;
  transaction_id?: string;
  order?: string;
}) {
  return sipayPost("/mdwr/v1/refund", {
    amount: String(opts.amountCents),
    currency: opts.currency ?? "EUR",
    ...(opts.transaction_id ? { transaction_id: opts.transaction_id } : {}),
    ...(opts.order ? { order: opts.order } : {}),
  });
}

/**
 * Apple Pay merchant session.
 *
 * Apple's flow requires a server-to-server validation step BEFORE the buyer
 * can interact with the sheet: the browser calls our backend with a
 * `validationURL` (one of Apple's gateway URLs), we forward it to Sipay,
 * Sipay validates with Apple using the merchant identity certificate it
 * holds on its side, and returns the opaque `merchantSession` blob that
 * we hand back to the browser via `session.completeMerchantValidation()`.
 *
 * Docs: https://developer.sipay.es/docs/documentation/online/selling/wallets/apay
 */
export function validateApplePaySession(opts: {
  validationURL: string;
  domain: string; // window.location.host, e.g. "editorpdf.net"
  title: string; // shown inside the Apple Pay sheet
}) {
  return sipayPost("/apay/api/v1/session", {
    url: opts.validationURL,
    domain: opts.domain,
    title: opts.title,
  });
}

/**
 * Apple Pay one-shot charge. Same endpoint as Google Pay
 * (/mdwr/v1/authorization) but `catcher.type` switches to "apay" and the
 * token is the structured `ApplePayPayment.token` (paymentData +
 * paymentMethod + transactionIdentifier), not a JSON string.
 *
 * The `requestId` is the session token Sipay returned from
 * /apay/api/v1/session — without it Sipay returns `no_card_data` because
 * it can't tie the charge to the Apple session we validated earlier.
 */
export function chargeApplePay(opts: {
  amountCents: number;
  currency?: string;
  tokenApay: {
    paymentData: unknown;
    paymentMethod: unknown;
    transactionIdentifier: string;
  };
  requestId: string;
  order: string;
  token?: string;
  custom_01?: string;
  custom_02?: string;
}) {
  return sipayPost("/mdwr/v1/authorization", {
    amount: opts.amountCents,
    currency: opts.currency ?? "EUR",
    catcher: {
      type: "apay",
      token_apay: opts.tokenApay,
      request_id: opts.requestId,
    },
    order: opts.order,
    // Vault the card under our merchant token (`usr-<userId>`) so the monthly
    // MIT-R cron can charge it later — same mechanism the card all-in-one uses.
    // Without this, wallet subs store only a cof_id, which Sipay rejects for
    // recurring charges ("no_card_from_token"), so they never renew.
    ...(opts.token ? { token: opts.token } : {}),
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
}

/**
 * Google Pay one-shot charge. Different endpoint (/authorization, not
 * /all-in-one) because the buyer is already authenticated by Google — no
 * 3DS redirect needed. We pass the Google Pay token JSON inside `catcher`
 * exactly as Sipay documents it.
 */
export function chargeGpay(opts: {
  amountCents: number;
  currency?: string;
  tokenGpay: string; // raw JSON string from Google Pay PaymentData
  order: string;
  token?: string;
  custom_01?: string;
  custom_02?: string;
}) {
  return sipayPost("/mdwr/v1/authorization", {
    amount: opts.amountCents,
    currency: opts.currency ?? "EUR",
    catcher: {
      type: "gpay",
      token_gpay: opts.tokenGpay,
    },
    order: opts.order,
    // Vault the card under our merchant token (`usr-<userId>`) so the monthly
    // MIT-R cron can charge it later — see chargeApplePay for the rationale.
    ...(opts.token ? { token: opts.token } : {}),
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
}

/**
 * Sandbox probe: fires an all-in-one with the documented VISA test card
 * (4548819407777774 12/25 CVV 123) for 0,50 € and returns the full Sipay
 * response so we can verify HMAC + endpoint connectivity without running
 * a real customer through it.
 */
export function probeSandbox(opts: { url_ok: string; url_ko: string }) {
  const order = `sandbox-probe-${Date.now()}`;
  return createPaymentWithTokenization({
    amountCents: 50,
    currency: "EUR",
    pan: "4548819407777774",
    month: "12",
    year: "2026",
    cvv: "123",
    token: `probe-${Date.now()}`,
    order,
    url_ok: opts.url_ok,
    url_ko: opts.url_ko,
  });
}

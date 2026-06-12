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

function sign(body: string): string {
  return crypto
    .createHmac("sha256", ENV.sipaySecret)
    .update(body)
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
  const signature = sign(requestBody);
  const endpoint = `${ENV.sipayEndpoint}${path}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 ${signature}`,
      "X-Signature": signature,
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
    url_ko: opts.url_ko,
    order: opts.order,
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
  return sipayPost("/mdwr/v1/all-in-one", {
    amount: String(opts.amountCents),
    currency: opts.currency ?? "EUR",
    operation: "all-in-one",
    fastpay: { request_id: opts.fastpayRequestId },
    token: opts.token,
    order: opts.order,
    url_ok: opts.url_ok,
    url_ko: opts.url_ko,
    ...(opts.custom_01 ? { custom_01: opts.custom_01 } : {}),
    ...(opts.custom_02 ? { custom_02: opts.custom_02 } : {}),
  });
}

/**
 * Recurring charge against a previously tokenized card. MIT (no customer
 * present), reason "R" = recurring. Used by the monthly cron.
 */
export function createMITRecurring(opts: {
  amountCents: number;
  currency?: string;
  token: string;
  order: string;
  custom_01?: string;
  custom_02?: string;
}) {
  return sipayPost("/mdwr/v1/all-in-one", {
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

import * as Sentry from "@sentry/node";

const DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
// Railway exposes the deploy's git SHA as RAILWAY_GIT_COMMIT_SHA. Tying
// each Sentry event to a release lets us see exactly which commit
// introduced a regression and links stack traces to source maps.
const RELEASE = process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA;

// Headers that carry secrets in this app. We HMAC-sign Sipay requests
// with X-Signature, the cron renewal endpoint authenticates via
// X-Cron-Secret, and session cookies obviously can't leak either.
// Anyone with Sentry read access shouldn't be able to spoof requests.
const SENSITIVE_HEADERS = [
  "authorization",
  "x-signature",
  "x-cron-secret",
  "cookie",
  "set-cookie",
];

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    // 5% of transactions traced — enough to spot slow endpoints without
    // burning the 10k/month free-tier quota.
    tracesSampleRate: 0.05,
    // ECONNRESET / ETIMEDOUT are clients hanging up — routine on the
    // public internet, not bugs in our code.
    ignoreErrors: ["ECONNRESET", "ETIMEDOUT", "EPIPE"],
    beforeSend(event) {
      const headers = event.request?.headers;
      if (headers && typeof headers === "object") {
        for (const k of SENSITIVE_HEADERS) {
          // Express normalises header names to lowercase but Sentry may
          // also include the original-case version, so cover both.
          for (const name of [k, k.toLowerCase(), k.toUpperCase()]) {
            if (name in headers) (headers as Record<string, unknown>)[name] = "[Filtered]";
          }
        }
      }
      // Drop request bodies entirely — these may contain card data
      // (FastPay callback), passwords (auth.register / resetPassword),
      // Sipay token, etc. Stack trace + URL is enough to debug.
      if (event.request && "data" in event.request) {
        event.request.data = "[Filtered]";
      }
      return event;
    },
  });
}

export { Sentry };

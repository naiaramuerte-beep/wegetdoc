import * as Sentry from "@sentry/react";

// Vite-injected env vars. The DSN is a public identifier (it identifies
// the Sentry project, not a credential), but we still read it from env
// so dev builds without a DSN simply skip init instead of crashing.
const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE;

// Errors that aren't actionable bugs:
//   - ResizeObserver loop noise fires constantly on scroll-heavy pages
//     and would burn our event quota.
//   - RenderingCancelledException is pdfjs cancelling an in-flight page
//     render — we already handle it in PdfEditor's mainRenderTaskRef.
//   - "Non-Error promise rejection captured" usually means a string was
//     thrown instead of an Error; there's no stack to act on.
//   - Browser-extension errors (chrome-extension://, moz-extension://)
//     are the user's extensions misbehaving, not our code.
//   - "Failed to fetch dynamically imported module" / "Loading chunk" are
//     stale-chunk-after-deploy errors. chunkReload.ts auto-recovers them
//     with a single page reload; reporting them would spam the quota
//     after every deploy.
const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "RenderingCancelledException",
  "Non-Error promise rejection captured",
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Loading chunk",
  "Loading CSS chunk",
];

const DENY_URLS = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-extension:\/\//,
  /googletagmanager\.com/,
  /google-analytics\.com/,
  /hotjar\.com/,
  // Sipay's FastPay bundle throws internally (e.g. "Cannot read properties of
  // undefined (reading 'data')" in its message handler on Opera). It's their
  // third-party code — not fixable by us — so drop errors originating from it.
  /fastpay\.js/,
  /\/fpay\//,
  /sipay\.es/,
];

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    // NO browserTracingIntegration on purpose. Its automatic instrumentation
    // monkeypatches history.pushState/replaceState and fetch. Inside the
    // Google app's in-app browser (GSA) on iOS, the host ALSO wraps those
    // globals; the two wrappers call each other and the first navigation on a
    // landing (e.g. an ad click to /ro) overflows the stack —
    // "RangeError: Maximum call stack size exceeded" — which breaks wouter's
    // pushState-based routing for that traffic. We only need error monitoring,
    // not performance tracing, so we drop the integration entirely.
    ignoreErrors: IGNORED_ERRORS,
    denyUrls: DENY_URLS,
    beforeSend(event) {
      // Drop "Failed to fetch" noise from Google Analytics / gtag pings and
      // from browser extensions that wrap window.fetch. Real example seen in
      // prod: a gtag beacon to region1.analytics.google.com fails, and an
      // ad-blocker/extension (chrome-extension://…/frame_ant.js) that had
      // monkeypatched fetch re-throws it. denyUrls misses it because the frame
      // Sentry blames is "/gtag/js" resolved against our own origin. Scan the
      // WHOLE stacktrace instead: if it's a fetch failure touching analytics,
      // gtag, or an extension frame, it's third-party telemetry — not our bug.
      try {
        const values = event.exception?.values ?? [];
        const msg = values.map((v) => v?.value ?? "").join(" ");
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          const frames = values.flatMap((v) => v?.stacktrace?.frames ?? []);
          const files = frames.map((f) => f?.filename ?? "").join(" ") + " " + msg;
          if (/chrome-extension:|moz-extension:|safari-web-extension:|\/gtag\/js|googletagmanager|analytics\.google\.com|google-analytics/i.test(files)) {
            return null;
          }
        }
      } catch {
        /* best-effort — never let filtering throw */
      }
      // Strip cookies: they carry session tokens. Anyone with Sentry
      // read access shouldn't be able to impersonate users via a leaked
      // event.
      if (event.request?.cookies) event.request.cookies = undefined;
      // Strip query strings — they sometimes contain payment IDs,
      // OAuth tokens, password-reset tokens.
      if (event.request?.query_string) event.request.query_string = "[Filtered]";
      return event;
    },
  });
}

export { Sentry };

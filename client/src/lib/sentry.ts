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
];

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    integrations: [Sentry.browserTracingIntegration()],
    // Sample 5% of transactions to stay within the 10k/month free-tier
    // quota. Errors are 100% — they're the signal we actually care about.
    tracesSampleRate: 0.05,
    ignoreErrors: IGNORED_ERRORS,
    denyUrls: DENY_URLS,
    beforeSend(event) {
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

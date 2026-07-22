// Initialize Sentry before anything else so it can capture init-time
// errors (failed dynamic imports, top-level throws in brand.ts, etc.)
// from the very first paint. The init is a no-op when VITE_SENTRY_DSN
// is not set, so local dev without env vars still works.
import { initSentry } from "@/lib/sentry";
initSentry();

// Auto-reload when a lazy() chunk fetch fails after a deploy. Wired
// before any lazy import so the listener is in place by the time
// React decides to mount a code-split route.
import { installChunkErrorRecovery } from "@/lib/chunkReload";
installChunkErrorRecovery();

// Auto-reload when the server is serving a newer build than this stale tab is
// running (belt-and-suspenders for cached index.html after a deploy).
import { installVersionAutoReload } from "@/lib/versionReload";
installVersionAutoReload();

// Capture the Google Ads click ID (gclid/gbraid/wbraid) from the landing URL
// ASAP, before any client-side redirect can strip the query, so we can report
// the conversion server-side later (survives Safari/ITP + adblockers).
import { captureGclid } from "@/lib/gclid";
captureGclid();

import "@/lib/brand"; // Set data-brand attribute early
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Redirect to home page with login modal
  const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : "es";
  window.location.href = `/${currentLang}?login=true`;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

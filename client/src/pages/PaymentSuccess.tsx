import { useEffect, useRef, useState } from "react";
import { CheckCircle, ArrowRight, Upload, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent, isInternalTest } from "@/lib/track";
import { INTRO_CHARGE_EUR, INTRO_CHARGE_CURRENCY } from "@/lib/pricing";

// The user has only paid the intro 0,50 € at this point; the recurring
// monthly isn't billed until trial_end. Display the real charged amount
// here so it matches the bank statement, not the future monthly price.
// INTRO_CHARGE_EUR is imported from @/lib/pricing so tracking events and
// the displayed value can't drift apart.

export default function PaymentSuccess() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const { adsTrackingEnabled } = useFeatureFlags();
  const { t, lang } = useLanguage();

  // ── Post-payment download ────────────────────────────────────────────────
  // Every Sipay flow (card 3DS, Apple Pay, Google Pay) lands here via a
  // full-page redirect, so the editor's in-memory PDF + its onPaymentSuccess
  // download handler are gone. We recover the document the user just paid for
  // by fetching their most recent saved doc and downloading it here. The doc
  // was auto-saved before payment and marked paid server-side by
  // finalizeFastpayPayment → markDocumentsPaid, so it's ready by the time the
  // success page loads.
  const { data: docs } = trpc.documents.list.useQuery(undefined, { staleTime: 0 });
  const latestDoc = docs && docs.length > 0 ? docs[0] : null;
  const hasDocRef = useRef(false);
  useEffect(() => { hasDocRef.current = !!latestDoc; }, [latestDoc]);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  // "trial-limit" when the user has used up their trial downloads (they still
  // paid, but the 3rd distinct file is gated); "error" for any other failure.
  const [downloadError, setDownloadError] = useState<"trial-limit" | "error" | null>(null);
  const autoTriedRef = useRef(false);

  const handleDownloadDoc = async () => {
    if (!latestDoc?.id) return;
    try {
      setDownloading(true);
      setDownloadError(null);
      const res = await fetch(`/api/documents/download/${latestDoc.id}`, { credentials: "include" });
      if (!res.ok) {
        // Surface the trial-download limit distinctly instead of a generic
        // failure — otherwise a paying user who re-downloads sees "could not
        // download" with no explanation (support ticket magnet).
        if (res.status === 403) {
          let body: any = null;
          try { body = await res.json(); } catch {}
          if (body?.error === "trial-limit") {
            setDownloadError("trial-limit");
            return;
          }
        }
        setDownloadError("error");
        throw new Error(`download failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (latestDoc as any).name || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // WebKit cancels the download if the blob URL is revoked too early.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch (err) {
      console.warn("[PaymentSuccess] auto-download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  // Best-effort auto-download once the doc list resolves. Browsers may block a
  // programmatic download without a user gesture — the button below is the
  // reliable fallback.
  useEffect(() => {
    if (latestDoc && !autoTriedRef.current) {
      autoTriedRef.current = true;
      handleDownloadDoc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDoc]);

  // Read txn id from URL once on mount so we can render it into the DOM
  // (Google Ads's review process scrapes the page and verifies the
  // transaction_id + value are present in DOM elements with the
  // `.transaction` and `.value` classes — see PR review case 0-6026000040625).
  const [txn, setTxn] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTxn(params.get('txn') || '');
  }, []);

  // Fire the funnel's payment_success event once per page load. This is
  // SEPARATE from the existing Google Ads `conversion` event below — that
  // one feeds Ads attribution (AW-...) for ad-spend ROI; this one feeds
  // GA4/Hotjar custom funnels so we can chart paywall_shown → success
  // without depending on the Ads conversion pipeline.
  const successFiredRef = useRef(false);
  useEffect(() => {
    if (successFiredRef.current) return;
    successFiredRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider") || ""; // sipay-apay | sipay-gpay | "" (card)
    const method = provider === "sipay-apay" ? "applepay"
                 : provider === "sipay-gpay" ? "googlepay"
                 : "card";
    trackEvent("payment_success", {
      plan: "subscription",
      amount: INTRO_CHARGE_EUR,
      currency: INTRO_CHARGE_CURRENCY,
      method,
    });
  }, []);

  // Google Ads conversion tracking (Compra) — gated by flag_ads_tracking.
  // The values are read from the rendered DOM (matching Google's reviewer
  // template) so their crawler can verify the conversion ping reflects
  // what the user actually sees on the page.
  useEffect(() => {
    if (!adsTrackingEnabled) return;
    if (isInternalTest()) return; // don't fire the Ads conversion during our own QA
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const valueEl = document.querySelector(".value") as HTMLElement | null;
      const txnEl = document.querySelector(".transaction") as HTMLElement | null;
      const getValue = Number((valueEl?.innerText ?? "").replace("€", "").replaceAll(".", "").replace(",", ".").trim());
      const getId = (txnEl?.innerText ?? "").trim();
      (window as any).gtag('event', 'conversion', {
        'send_to': 'AW-18071860641/pjCqCJ3srZkcEKHrqqlD',
        'transaction_id': getId,
        'value': Number.isFinite(getValue) && getValue > 0 ? getValue : INTRO_CHARGE_EUR,
        'currency': 'EUR',
      });
    }
  }, [adsTrackingEnabled, txn]);

  // EUR display in es-ES style: "0,50€".
  const valueDisplay = `${INTRO_CHARGE_EUR.toFixed(2).replace(".", ",")}€`;

  useEffect(() => {
    // Invalidate subscription status so it refreshes
    utils.subscription.status.invalidate();

    // Detect lang from URL
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";

    // `?capture=1` pauses the countdown so we can screenshot the success
    // page calmly for the Google Pay Web Integration review submission.
    // Without this flag the user gets bounced to the home page after 5s.
    const captureMode = new URLSearchParams(window.location.search).get("capture") === "1";
    if (captureMode) return;

    // Auto-redirect to home after countdown — but ONLY if there's no document
    // to download. If the user has a paid doc waiting, we keep them on this
    // page so they can grab it (auto-download may have been blocked).
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasDocRef.current) navigate(`/${lang}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleGoNow = () => {
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";
    navigate(`/${lang}`);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "#f8fafc" }}
    >
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(34, 197, 94, 0.12)" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "#16a34a" }} />
      </div>

      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ color: "#0f172a" }}
      >
        {t.payment_success_title || "¡Pago completado!"}
      </h1>
      <p
        className="text-base mb-4 max-w-md"
        style={{ color: "#64748b" }}
      >
        {t.payment_success_subtitle || "Tu documento está guardado en tu panel y listo para descargar."}
      </p>

      {/* Countdown redirect notice — only when there's nothing to download. */}
      {!latestDoc && (
        <div
          className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(10, 10, 11, 0.04)",
            border: "1px solid rgba(10, 10, 11, 0.12)",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#E63946" }} />
          <span className="text-sm font-medium" style={{ color: "#0A0A0B" }}>
            {t.payment_success_redirecting_pre || "Redirigiendo en "}
            <strong>{countdown}</strong>
            {t.payment_success_redirecting_post || "s..."}
          </span>
        </div>
      )}

      {/* Transaction summary — REQUIRED by Google Ads review (case 0-6026000040625).
          The .transaction and .value classes are read by the gtag
          conversion script on this page so the values reported match
          what the user sees. Don't remove or rename these classes. */}
      <div
        className="mb-8 px-5 py-3 rounded-xl text-left"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", minWidth: 280 }}
      >
        <p className="text-[11px] uppercase font-semibold tracking-wider mb-1.5" style={{ color: "#94a3b8" }}>
          {t.payment_success_order_summary || "Resumen del pedido"}
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "#64748b" }}>{t.payment_success_txn_id || "ID de transacción:"}</span>
          <span className="transaction font-mono text-xs" style={{ color: "#0f172a" }}>{txn || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm mt-1">
          <span style={{ color: "#64748b" }}>{t.payment_success_amount || "Importe:"}</span>
          <span className="value font-semibold" style={{ color: "#0f172a" }}>{valueDisplay}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        {latestDoc && (
          <button
            onClick={handleDownloadDoc}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#16a34a" }}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {downloading
              ? ((t as any).payment_success_downloading || "Descargando...")
              : downloaded
              ? ((t as any).payment_success_download_again || "Descargar de nuevo")
              : ((t as any).payment_success_download_cta || "Descargar tu PDF")}
          </button>
        )}
        <button
          onClick={handleGoNow}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:opacity-90"
          style={
            latestDoc
              ? { backgroundColor: "#FFFFFF", color: "#0f172a", border: "1px solid #e2e8f0" }
              : { backgroundColor: "#E63946", color: "#FFFFFF" }
          }
        >
          <Upload className="w-4 h-4" />
          {t.payment_success_cta_edit_another || "Editar otro PDF"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Download-error notice — trial-limit gets a clear explanation + CTA,
          any other failure gets a generic retry hint. */}
      {downloadError && (
        <div
          className="p-4 rounded-xl max-w-sm w-full text-left mb-8 text-sm"
          style={{ backgroundColor: "#FFF7ED", border: "1px solid #fed7aa", color: "#9a3412" }}
        >
          {downloadError === "trial-limit" ? (
            <>
              <p className="font-semibold mb-1">
                {(t as any).payment_success_trial_limit_title || "Has usado tus descargas de prueba"}
              </p>
              <p style={{ color: "#b45309" }}>
                {(t as any).payment_success_trial_limit_body ||
                  "Tu prueba incluye un número limitado de descargas y ya las has usado. Puedes descargar de nuevo cualquier archivo que ya bajaste desde tu panel, o mejorar tu plan para descargas ilimitadas."}
              </p>
              <button
                onClick={() => navigate(`/${lang}/dashboard`)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold text-xs"
                style={{ backgroundColor: "#E63946" }}
              >
                {(t as any).payment_success_go_dashboard || "Ir a mi panel"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <p>
              {(t as any).payment_success_download_error ||
                "No se pudo descargar el archivo en este momento. Tu documento está guardado en tu panel — inténtalo de nuevo desde ahí."}
            </p>
          )}
        </div>
      )}

      {/* What you can do now */}
      <div
        className="p-5 rounded-xl max-w-sm w-full text-left"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #e2e8f0",
        }}
      >
        <h3
          className="font-bold mb-3 text-sm"
          style={{ color: "#0f172a" }}
        >
          {t.payment_success_what_now || "¿Qué puedes hacer ahora?"}
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "#475569" }}>
          {[
            t.payment_success_b1 || "Descargar tus PDFs editados sin marca de agua",
            t.payment_success_b2 || "Editar cualquier documento desde tu panel",
            t.payment_success_b3 || "Añadir texto, firmas y anotaciones",
            t.payment_success_b4 || "Comprimir, fusionar y dividir PDFs",
            t.payment_success_b5 || "Acceder a tus documentos en cualquier momento",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#16a34a" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

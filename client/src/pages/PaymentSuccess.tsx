import { useEffect, useState } from "react";
import { CheckCircle, ArrowRight, Upload, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { usePricing } from "@/lib/usePricing";

export default function PaymentSuccess() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const { adsTrackingEnabled } = useFeatureFlags();
  const { priceEur } = usePricing();

  // Read txn id from URL once on mount so we can render it into the DOM
  // (Google Ads's review process scrapes the page and verifies the
  // transaction_id + value are present in DOM elements with the
  // `.transaction` and `.value` classes — see PR review case 0-6026000040625).
  const [txn, setTxn] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTxn(params.get('txn') || '');
  }, []);

  // Google Ads conversion tracking (Compra) — gated by flag_ads_tracking.
  // The values are read from the rendered DOM (matching Google's reviewer
  // template) so their crawler can verify the conversion ping reflects
  // what the user actually sees on the page.
  useEffect(() => {
    if (!adsTrackingEnabled) return;
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const valueEl = document.querySelector(".value") as HTMLElement | null;
      const txnEl = document.querySelector(".transaction") as HTMLElement | null;
      const getValue = Number((valueEl?.innerText ?? "").replace("€", "").replaceAll(".", "").replace(",", ".").trim());
      const getId = (txnEl?.innerText ?? "").trim();
      (window as any).gtag('event', 'conversion', {
        'send_to': 'AW-18071860641/pjCqCJ3srZkcEKHrqqlD',
        'transaction_id': getId,
        'value': Number.isFinite(getValue) && getValue > 0 ? getValue : priceEur,
        'currency': 'EUR',
      });
    }
  }, [adsTrackingEnabled, priceEur, txn]);

  // EUR display in es-ES style: "39,90€" (matches the value we strip back out
  // for gtag — no thousand separators expected at our price ranges).
  const valueDisplay = `${priceEur.toFixed(2).replace(".", ",")}€`;

  useEffect(() => {
    // Invalidate subscription status so it refreshes
    utils.subscription.status.invalidate();

    // Detect lang from URL
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";

    // Auto-redirect to dashboard documents tab after countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(`/${lang}`);
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
        style={{ backgroundColor: "rgba(27, 94, 32, 0.12)" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "#1565C0" }} />
      </div>

      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ color: "#0f172a" }}
      >
        ¡Pago completado!
      </h1>
      <p
        className="text-base mb-4 max-w-md"
        style={{ color: "#64748b" }}
      >
        Tu suscripción está activa. Tu documento está guardado en tu panel y listo para descargar.
      </p>

      {/* Countdown redirect notice */}
      <div
        className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: "rgba(27, 94, 32, 0.08)",
          border: "1px solid rgba(27, 94, 32, 0.20)",
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#1565C0" }} />
        <span className="text-sm font-medium" style={{ color: "#1A3A5C" }}>
          Redirigiendo en <strong>{countdown}</strong>s...
        </span>
      </div>

      {/* Transaction summary — REQUIRED by Google Ads review (case 0-6026000040625).
          The .transaction and .value classes are read by the gtag
          conversion script on this page so the values reported match
          what the user sees. Don't remove or rename these classes. */}
      <div
        className="mb-8 px-5 py-3 rounded-xl text-left"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", minWidth: 280 }}
      >
        <p className="text-[11px] uppercase font-semibold tracking-wider mb-1.5" style={{ color: "#94a3b8" }}>
          Resumen del pedido
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "#64748b" }}>ID de transacción:</span>
          <span className="transaction font-mono text-xs" style={{ color: "#0f172a" }}>{txn || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm mt-1">
          <span style={{ color: "#64748b" }}>Importe:</span>
          <span className="value font-semibold" style={{ color: "#0f172a" }}>{valueDisplay}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <button
          onClick={handleGoNow}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
          style={{
            backgroundColor: "#1565C0",
          }}
        >
          <Upload className="w-4 h-4" />
          Editar otro PDF
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

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
          ¿Qué puedes hacer ahora?
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "#475569" }}>
          {[
            "Descargar tus PDFs editados sin marca de agua",
            "Editar cualquier documento desde tu panel",
            "Añadir texto, firmas y anotaciones",
            "Comprimir, fusionar y dividir PDFs",
            "Acceder a tus documentos en cualquier momento",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#1565C0" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/*
 * PaywallModal — Diseño dos columnas:
 * - Izquierda: preview del PDF (miniatura)
 * - Derecha: formulario de pago con Stripe Elements
 * Checkbox obligatorio con borde rojo si no se acepta
 */
import { useState, useEffect } from "react";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Prefer live key (user-provided) over system default
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  ""
);

// PDF data can be base64 (from editor) or tempKey (from S3 temp upload after login redirect)
type PdfPayload =
  | { base64: string; name: string; size: number }
  | { tempKey: string; name: string };

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
  pdfData?: { base64: string; name: string; size: number };
  onPaymentSuccess?: () => void;
  thumbnailUrl?: string;
  /** Called when pdfData is missing — builds the annotated PDF on demand */
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
}

type Step = "auth-choice" | "email-form" | "plans";

// ── Checkout form (inside <Elements>) ────────────────────────────────────────
function CheckoutForm({
  onSuccess,
  pdfData,
  thumbnailUrl,
  buildPdfForUpload,
}: {
  onSuccess: () => void;
  pdfData?: PdfPayload;
  thumbnailUrl?: string;
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
}) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [agreed, setAgreed] = useState(false);
  const [showCheckboxError, setShowCheckboxError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<"idle" | "card" | "subscription" | "saving" | "done">("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"card" | "gpay">("card");

  const createSetupIntent = trpc.subscription.createSetupIntent.useMutation();
  const confirmSubscription = trpc.subscription.confirmSubscription.useMutation();
  const utils = trpc.useUtils();

  // Upload PDF via REST multipart (avoids tRPC base64 size limits)
  const uploadPdfViaRest = async (data: { base64: string; name: string; size: number }): Promise<void> => {
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", blob, data.name);
    formData.append("name", data.name);
    const resp = await fetch("/api/documents/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }
  };

  // Claim a temp PDF from S3 (uploaded before login redirect)
  const claimTempPdf = async (tempKey: string, name: string): Promise<void> => {
    const resp = await fetch("/api/documents/claim-temp", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempKey, name }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Claim failed: ${resp.status} ${text}`);
    }
  };

  useEffect(() => {
    createSetupIntent.mutateAsync().then((result) => {
      setClientSecret(result.clientSecret);
      setCustomerId(result.customerId);
    }).catch((err) => {
      console.error("Failed to create SetupIntent:", err);
      toast.error(t.paywall_loading_form);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!stripe || !elements || !clientSecret || !customerId) {
      toast.error(t.paywall_loading_form);
      return;
    }
    if (!agreed) {
      setShowCheckboxError(true);
      return;
    }

    setIsLoading(true);
    setProgressStep("card");
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        const stripeErrorMap: Record<string, string> = {
          'card_declined': 'Tarjeta rechazada. Por favor, verifica los datos o usa otra tarjeta.',
          'insufficient_funds': 'Fondos insuficientes. Por favor, usa otra tarjeta.',
          'incorrect_cvc': 'El código CVC es incorrecto.',
          'expired_card': 'La tarjeta ha caducado.',
          'incorrect_number': 'El número de tarjeta es incorrecto.',
          'card_velocity_exceeded': 'Demasiados intentos. Por favor, espera unos minutos e inténtalo de nuevo.',
        };
        const friendlyMsg = error.code ? stripeErrorMap[error.code] : null;
        toast.error(friendlyMsg || error.message || 'Error al procesar la tarjeta');
        setIsLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        toast.error('No se pudo obtener el método de pago. Por favor, inténtalo de nuevo.');
        setIsLoading(false);
        return;
      }

      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      // 1. Confirm subscription first (so the user is premium when we upload)
      setProgressStep("subscription");
      await confirmSubscription.mutateAsync({ paymentMethodId, customerId });
      await utils.subscription.status.invalidate();

      // 2. Upload PDF now that subscription is active
      setProgressStep("saving");

      // Case A: pdfData has a tempKey (uploaded to S3 before login redirect)
      if (pdfData && "tempKey" in pdfData) {
        try {
          await claimTempPdf(pdfData.tempKey, pdfData.name);
          await utils.documents.list.invalidate();
        } catch (claimErr) {
          console.error("[PaywallModal] claimTempPdf failed:", claimErr);
          // Don't block success — user paid, subscription is active
        }
      } else {
        // Case B: pdfData has base64 (built in-memory, user was already logged in)
        let resolvedPdfData = pdfData as { base64: string; name: string; size: number } | undefined;
        if (!resolvedPdfData && buildPdfForUpload) {
          try {
            resolvedPdfData = (await buildPdfForUpload()) ?? undefined;
          } catch (buildErr) {
            console.error("[PaywallModal] buildPdfForUpload failed:", buildErr);
          }
        }
        if (resolvedPdfData) {
          try {
            await uploadPdfViaRest(resolvedPdfData);
            await utils.documents.list.invalidate();
          } catch (uploadErr) {
            console.error("PDF upload failed (attempt 1):", uploadErr);
            try {
              await uploadPdfViaRest(resolvedPdfData);
              await utils.documents.list.invalidate();
            } catch (uploadErr2) {
              console.error("PDF upload failed (attempt 2):", uploadErr2);
              // Don't block success — user paid, subscription is active
            }
          }
        }
      }

      setProgressStep("done");
      toast.success(t.paywall_doc_ready + " " + t.paywall_processing);
      onSuccess();
    } catch (err: unknown) {
      setProgressStep("idle");
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      if (message.toLowerCase().includes('velocity') || message.toLowerCase().includes('too many')) {
        toast.error('Demasiados intentos. Por favor, espera unos minutos e inténtalo de nuevo.');
      } else {
        toast.error(message || 'Error al procesar el pago. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-0">
      {/* ── Left: PDF Preview ── */}
      <div className="hidden md:flex flex-col items-center justify-center bg-slate-50 border-r border-slate-100 p-6" style={{ minWidth: 200, maxWidth: 220 }}>
        <div
          className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: "0.707", maxHeight: 260 }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Vista previa del documento"
              className="w-full h-full object-contain"
            />
          ) : (
            /* Skeleton PDF page */
            <div className="w-full h-full p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-7 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-[8px] font-bold">PDF</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 bg-slate-200 rounded w-full" />
                  <div className="h-1.5 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-1.5 bg-slate-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
              <div className="mt-2 space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-1.5 bg-slate-100 rounded" style={{ width: `${60 + (i % 4) * 10}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center leading-tight">
          {pdfData?.name ?? "documento.pdf"}
        </p>
      </div>

      {/* ── Right: Payment form ── */}
      <div className="flex-1 p-6 flex flex-col">
        {/* Amount row */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎁</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">100% Discount</p>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">New User</span>
              </div>
              <p className="text-xs text-slate-400">{t.paywall_trial_plan}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-500">0,00 €</p>
        </div>

        {/* Payment method tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab("card")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex-1 justify-center"
            style={{
              borderColor: activeTab === "card" ? "#1a3c6e" : "#e2e8f0",
              backgroundColor: activeTab === "card" ? "#eef3fb" : "white",
              color: activeTab === "card" ? "#1a3c6e" : "#64748b",
            }}
          >
            <CreditCard className="w-4 h-4" />
            {t.paywall_card_tab ?? "Tarjeta"}
          </button>
          <button
            onClick={() => setActiveTab("gpay")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex-1 justify-center"
            style={{
              borderColor: activeTab === "gpay" ? "#1a3c6e" : "#e2e8f0",
              backgroundColor: activeTab === "gpay" ? "#eef3fb" : "white",
              color: activeTab === "gpay" ? "#1a3c6e" : "#64748b",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Pay
          </button>
        </div>

        {/* Card form */}
        {activeTab === "card" && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.paywall_card_number}</label>
            <div
              className="border rounded-lg px-3 py-3.5"
              style={{ borderColor: "#e2e8f0", backgroundColor: "#fff" }}
            >
              {clientSecret ? (
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "15px",
                        color: "#1e293b",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        "::placeholder": { color: "#94a3b8" },
                        iconColor: "#64748b",
                      },
                      invalid: { color: "#ef4444", iconColor: "#ef4444" },
                    },
                    hidePostalCode: true,
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.paywall_loading_form}
                </div>
              )}
            </div>
            {/* Bank verification notice */}
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Tu banco puede mostrar una verificación de 0,00€. No se realizará ningún cargo durante los 7 días de prueba.
            </p>
          </div>
        )}

        {/* Google Pay placeholder */}
        {activeTab === "gpay" && (
          <div className="mb-5 p-4 rounded-lg bg-gray-50 border border-gray-200 text-center text-sm text-gray-500">
            {t.paywall_gpay_soon}
          </div>
        )}

        {/* Legal checkbox — borde rojo si no aceptado */}
        <div
          className="rounded-lg p-3 mb-4 cursor-pointer transition-all"
          style={{
            border: showCheckboxError && !agreed ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
            backgroundColor: showCheckboxError && !agreed ? "#fff5f5" : "#f8faff",
          }}
          onClick={() => {
            setAgreed(!agreed);
            if (!agreed) setShowCheckboxError(false);
          }}
        >
          <label className="flex items-start gap-2.5 cursor-pointer">
            <div
              className="mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
              style={{
                borderColor: agreed ? "#1a3c6e" : (showCheckboxError ? "#ef4444" : "#cbd5e1"),
                backgroundColor: agreed ? "#1a3c6e" : "white",
              }}
            >
              {agreed && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-xs leading-relaxed text-slate-600">
              {t.paywall_legal_text}{" "}
              <a
                href="mailto:support@pdfup.io"
                className="underline text-slate-700 hover:text-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                support@pdfup.io
              </a>
            </span>
          </label>
        </div>

        {/* Required field error */}
        {showCheckboxError && !agreed && (
          <div className="flex items-center gap-1.5 mb-3 text-red-500">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium">Campo obligatorio</span>
          </div>
        )}

        {/* Progress steps — visible during payment processing */}
        {isLoading && (
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            {([
              { key: "card",         label: "Verificando tarjeta...",      icon: "💳" },
              { key: "subscription", label: "Procesando...",               icon: "⚙️" },
              { key: "saving",       label: "Guardando tu documento...",   icon: "📄" },
              { key: "done",         label: "¡Todo listo!",                icon: "🎉" },
            ] as const).map((step, idx, arr) => {
              const stepOrder = ["card", "subscription", "saving", "done"] as const;
              const currentIdx = stepOrder.indexOf(progressStep as typeof stepOrder[number]);
              const stepIdx = stepOrder.indexOf(step.key);
              const isDone    = stepIdx < currentIdx;
              const isActive  = stepIdx === currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-3 py-1.5">
                  {/* Icon / spinner */}
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {isDone ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#1a3c6e]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                    )}
                  </div>
                  {/* Label */}
                  <span className={`text-sm font-medium transition-colors ${
                    isDone    ? "text-green-600" :
                    isActive  ? "text-[#1a3c6e]" :
                    "text-slate-300"
                  }`}>
                    {step.label}
                  </span>
                  {/* Connector line (not last) */}
                  {idx < arr.length - 1 && (
                    <div className="ml-auto w-px h-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !clientSecret || activeTab === "gpay"}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-base transition-all duration-200 mt-auto"
          style={{
            backgroundColor: (isLoading || !clientSecret || activeTab === "gpay") ? "#94a3b8" : "#1a3c6e",
            cursor: (isLoading || !clientSecret || activeTab === "gpay") ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {progressStep === "saving" ? "Guardando tu documento..." :
               progressStep === "subscription" ? "Procesando..." :
               progressStep === "done" ? "¡Completado!" :
               "Verificando tarjeta..."}
            </>
          ) : (
            t.paywall_pay_download
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PaywallModal({
  isOpen,
  onClose,
  action,
  pdfData,
  onPaymentSuccess,
  thumbnailUrl,
  buildPdfForUpload,
}: PaywallModalProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { savePdfToSession, setPendingPaywall, pendingFile, pendingEditedPdf, clearPendingEditedPdf, saveEditedPdfToSession } = usePdfFile();
  const [step, setStep] = useState<Step>(isAuthenticated ? "plans" : "auth-choice");
  const [emailInput, setEmailInput] = useState("");

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;
  // Use pdfData from prop OR from sessionStorage-restored pendingEditedPdf (after login redirect)
  const effectivePdfData = pdfData ?? pendingEditedPdf ?? undefined;

  const handleGoogleLogin = async () => {
    // Save the original PDF file
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
     // Save the EDITED PDF (with annotations) so it survives the OAuth redirect
    if (pdfData) {
      try { await saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size); } catch {}
    }
    setPendingPaywall(true);
    // Use direct Google OAuth (shows "PDFUp" on Google consent screen)
    const returnPath = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnPath)}`;
  };
  const handleEmailContinue = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error(t.paywall_enter_email);
      return;
    }
    // Save the original PDF file
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    // Save the EDITED PDF (with annotations) so it survives the OAuth redirect
    if (pdfData) {
      try { await saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size); } catch {}
    }
    setPendingPaywall(true);
    window.location.href = getLoginUrl();
  };

  const handlePaymentSuccess = () => {
    // ── Google Ads Conversion Tracking (inline Stripe Elements payment) ──
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-18034146775/8NSFCKitgI4cENf7rJdD',
        'value': 25.0,
        'currency': 'EUR',
        'transaction_id': `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
    }
    clearPendingEditedPdf();
    onClose();
    if (onPaymentSuccess) onPaymentSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: currentStep === "plans" ? 720 : 520, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* ── Auth Choice ── */}
        {currentStep === "auth-choice" && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1a3c6e] flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t.paywall_create_account}
              </h2>
              <p className="text-sm text-gray-500">
                {t.paywall_sign_up_seconds}
              </p>
            </div>
            <div className="space-y-3 max-w-sm mx-auto">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 bg-white hover:border-gray-400 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {t.paywall_continue_google}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t.paywall_or}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => setStep("email-form")}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 bg-white hover:border-gray-400 transition-all"
              >
                <Mail className="w-4 h-4" />
                {t.paywall_continue_email}
              </button>
            </div>
            <p className="text-center text-xs mt-5 text-gray-400">
              {t.paywall_by_continuing}{" "}
              <a href="/terms" className="underline text-gray-600">{t.paywall_terms}</a>{" "}
              {t.paywall_or}{" "}
              <a href="/privacy" className="underline text-gray-600">{t.paywall_privacy}</a>
            </p>
          </div>
        )}

        {/* ── Email Form ── */}
        {currentStep === "email-form" && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.paywall_enter_email}</h2>
              <p className="text-sm text-gray-500">{t.paywall_email_link}</p>
            </div>
            <div className="max-w-sm mx-auto space-y-4">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c6e]"
                onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
              />
              <button
                onClick={handleEmailContinue}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1a3c6e] text-white font-bold text-sm hover:bg-[#15305a] transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                {t.paywall_continue}
              </button>
              <button
                onClick={() => setStep("auth-choice")}
                className="w-full text-sm text-gray-400 hover:text-gray-700 py-2 transition-colors"
              >
                {t.paywall_back}
              </button>
            </div>
          </div>
        )}

        {/* ── Plans: payment step ── */}
        {currentStep === "plans" && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-600">{t.paywall_doc_ready}</p>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {t.paywall_one_step}
                </h2>
              </div>
            </div>

            {/* Two-column layout */}
            <Elements stripe={stripePromise}>
              <CheckoutForm
                onSuccess={handlePaymentSuccess}
                pdfData={effectivePdfData}
                thumbnailUrl={thumbnailUrl}
                buildPdfForUpload={buildPdfForUpload}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}

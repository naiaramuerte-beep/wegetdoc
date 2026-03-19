/*
 * PaywallModal — Diseño idéntico a pdfe.com con soporte i18n completo:
 * 1. Sin cuenta → pantalla de login (Google / Email)
 * 2. Con cuenta → modal de pago con Stripe Elements
 */
import { useState, useEffect } from "react";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight } from "lucide-react";
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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
  pdfData?: { base64: string; name: string; size: number };
  onPaymentSuccess?: () => void;
}

type Step = "auth-choice" | "email-form" | "plans";

// ── Checkout form (inside <Elements>) ────────────────────────────────────────
function CheckoutForm({
  onSuccess,
  pdfData,
}: {
  onSuccess: () => void;
  pdfData?: { base64: string; name: string; size: number };
}) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"card" | "gpay">("card");

  const createSetupIntent = trpc.subscription.createSetupIntent.useMutation();
  const confirmSubscription = trpc.subscription.confirmSubscription.useMutation();
  const uploadDocument = trpc.documents.upload.useMutation();
  const utils = trpc.useUtils();

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
      toast.error(t.paywall_legal_text.slice(0, 60) + "...");
      return;
    }

    setIsLoading(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        toast.error(error.message || "Card error");
        setIsLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        toast.error("Could not retrieve payment method");
        setIsLoading(false);
        return;
      }

      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      if (pdfData) {
        try {
          const doc = await uploadDocument.mutateAsync({
            name: pdfData.name,
            base64: pdfData.base64,
            size: pdfData.size,
          });
          if (doc) {
            localStorage.setItem("pdfpro_pending_doc_id", String(doc.id));
            localStorage.setItem("pdfpro_pending_doc_name", pdfData.name);
            localStorage.setItem("pdfpro_pending_doc_url", doc.fileUrl ?? "");
          }
        } catch (uploadErr) {
          console.error("PDF upload failed:", uploadErr);
        }
      }

      await confirmSubscription.mutateAsync({ paymentMethodId, customerId });
      await utils.subscription.status.invalidate();

      toast.success(t.paywall_doc_ready + " " + t.paywall_processing);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment error";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Amount row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{t.paywall_amount_label}</p>
          <p className="text-xs font-medium text-gray-400">{t.paywall_trial_plan}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900">0,50 €</p>
      </div>

      {/* Payment method tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("card")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
          style={{
            borderColor: activeTab === "card" ? "#1a1a2e" : "#e2e8f0",
            backgroundColor: activeTab === "card" ? "#f8faff" : "white",
            color: activeTab === "card" ? "#1a1a2e" : "#64748b",
          }}
        >
          <CreditCard className="w-4 h-4" />
          Card
        </button>
        <button
          onClick={() => setActiveTab("gpay")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
          style={{
            borderColor: activeTab === "gpay" ? "#1a1a2e" : "#e2e8f0",
            backgroundColor: activeTab === "gpay" ? "#f8faff" : "white",
            color: activeTab === "gpay" ? "#1a1a2e" : "#64748b",
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
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.paywall_card_number}</label>
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
          </div>
        </div>
      )}

      {/* Google Pay placeholder */}
      {activeTab === "gpay" && (
        <div className="mb-5 p-4 rounded-lg bg-gray-50 border border-gray-200 text-center text-sm text-gray-500">
          {t.paywall_gpay_soon}
        </div>
      )}

      {/* Legal checkbox */}
      <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-gray-900"
        />
        <span className="text-xs leading-relaxed text-gray-500">
          {t.paywall_legal_text}{" "}
          <a href="mailto:support@editpdf.online" className="underline text-gray-700 hover:text-gray-900">support@editpdf.online</a>
        </span>
      </label>

      {/* CTA button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !agreed || !clientSecret || activeTab === "gpay"}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-base transition-all duration-200"
        style={{
          backgroundColor: (isLoading || !agreed || !clientSecret || activeTab === "gpay") ? "#94a3b8" : "#111827",
          cursor: (isLoading || !agreed || !clientSecret || activeTab === "gpay") ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.paywall_processing}
          </>
        ) : (
          t.paywall_pay_download
        )}
      </button>
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
}: PaywallModalProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { savePdfToSession, setPendingPaywall, pendingFile } = usePdfFile();
  const [step, setStep] = useState<Step>(isAuthenticated ? "plans" : "auth-choice");
  const [emailInput, setEmailInput] = useState("");

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;
  const actionLabel = action ?? t.paywall_pay_download.toLowerCase();

  const handleGoogleLogin = async () => {
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    setPendingPaywall(true);
    window.location.href = getLoginUrl();
  };

  const handleEmailContinue = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error(t.paywall_enter_email);
      return;
    }
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    setPendingPaywall(true);
    window.location.href = getLoginUrl();
  };

  const handlePaymentSuccess = () => {
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
        style={{ maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}
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
              <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
              />
              <button
                onClick={handleEmailContinue}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors"
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
            <div className="flex items-start gap-4 p-6 pb-4 border-b border-gray-100">
              {/* PDF preview thumbnail */}
              <div
                className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ minWidth: 80 }}
              >
                {pdfData?.base64 ? (
                  <img
                    src={`data:application/pdf;base64,${pdfData.base64.slice(0, 100)}`}
                    alt="PDF preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-10 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-500 text-xs font-bold">PDF</span>
                  </div>
                  <div className="w-10 h-1 bg-gray-200 rounded" />
                  <div className="w-8 h-1 bg-gray-200 rounded" />
                  <div className="w-10 h-1 bg-gray-200 rounded" />
                </div>
              </div>

              {/* Title */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-600">{t.paywall_doc_ready}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  {t.paywall_one_step}
                </h2>
              </div>
            </div>

            {/* Stripe checkout form */}
            <Elements stripe={stripePromise}>
              <CheckoutForm
                onSuccess={handlePaymentSuccess}
                pdfData={pdfData}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}

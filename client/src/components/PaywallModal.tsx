/*
 * PaywallModal — Stripe Payment with PDF preview
 * Two-column layout: PDF preview (left) + payment form (right)
 */
import { useState, useEffect, useCallback } from "react";
import { colors } from "@/lib/brand";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight, Eye, EyeOff, Lock, Shield } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type PdfPayload =
  | { base64: string; name: string; size: number }
  | { tempKey: string; name: string };

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
  pdfData?: { base64: string; name: string; size: number };
  onPaymentSuccess?: (transactionId?: string) => void;
  thumbnailUrl?: string;
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
}

type Step = "auth-choice" | "email-form" | "plans";

// ── Card brand icons (inline SVGs) ──────────────────────────────────────
function CardBrands() {
  return (
    <div className="flex items-center gap-1.5">
      {/* Visa */}
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="opacity-60">
        <rect width="32" height="20" rx="3" fill="#1A1F71"/>
        <path d="M13.2 13.5h-2l1.2-7.5h2l-1.2 7.5zm7-7.3l-1.8 5.1-.2-1-.7-3.5s-.1-.6-.8-.6h-2.5l-.1.2s.8.2 1.7.7l1.4 5.4h2.1l3.2-7.5h-2.1l-.2 1.2zm4.8 7.3h1.9l-1.7-7.5h-1.6c-.5 0-.9.3-1.1.8l-2.9 6.7h2.1l.4-1.1h2.5l.4 1.1zm-2.2-2.7l1-2.9.6 2.9h-1.6zM11.5 6l-2 5.2L9.3 10c-.3-1.2-1.4-2.5-2.5-3.2l1.8 6.7h2.1L13.6 6h-2.1z" fill="white"/>
      </svg>
      {/* Mastercard */}
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="opacity-60">
        <rect width="32" height="20" rx="3" fill="#252525"/>
        <circle cx="12.5" cy="10" r="5.5" fill="#EB001B"/>
        <circle cx="19.5" cy="10" r="5.5" fill="#F79E1B"/>
        <path d="M16 5.8a5.48 5.48 0 012 4.2 5.48 5.48 0 01-2 4.2 5.48 5.48 0 01-2-4.2c0-1.7.7-3.2 2-4.2z" fill="#FF5F00"/>
      </svg>
      {/* Amex */}
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="opacity-60">
        <rect width="32" height="20" rx="3" fill="#006FCF"/>
        <path d="M5 8l1.5-3h1.8l.8 2 .8-2h1.8L13 8v5H5V8zm14.5-3h5L26 7l1.5-2h0l-2 2.5L27 10l-1.5-2L24 10h-5V5h.5z" fill="white" opacity=".9"/>
      </svg>
    </div>
  );
}

// ── Inner payment form (must be inside <Elements>) ──────────────────────
function PaymentForm({ onSuccess, userCountry, userPostalCode }: { onSuccess: () => void; userCountry: string; userPostalCode: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const { t, lang } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          payment_method_data: {
            billing_details: {
              address: {
                country: userCountry,
                postal_code: userPostalCode,
              },
            },
          },
        },
      });
      if (error) {
        toast.error(error.message ?? "Payment failed");
      } else {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card fields */}
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" }, fields: { billingDetails: { address: { country: "never", postalCode: "never" } } }, terms: { card: "never", auBecsDebit: "never", bancontact: "never", ideal: "never", sepaDebit: "never", sofort: "never", usBankAccount: "never", cashapp: "never" } } as any} />

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-200 disabled:opacity-40"
        style={{ backgroundColor: "#1B5E20" }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.paywall_processing}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            Download PDF
          </span>
        )}
      </button>

      {/* Legal disclaimer */}
      <p className="text-[9px] text-slate-300 leading-relaxed text-center">
        By proceeding, you agree to a 7-day trial (0,50&nbsp;€) and a subsequent monthly subscription of 19,99&nbsp;€. You authorize recurring charges and can cancel at any time. You have 14 calendar days to request a refund, subject to our{" "}
        <a href={`/${lang}/terms`} target="_blank" className="underline hover:text-slate-400">Terms of Service</a>{" "}
        and{" "}
        <a href={`/${lang}/privacy`} target="_blank" className="underline hover:text-slate-400">Privacy Policy</a>.
      </p>
    </form>
  );
}

// ── Stripe checkout form with PDF preview ──────────────────────────────
function StripeCheckoutForm({
  onSuccess,
  pdfData,
  thumbnailUrl,
  buildPdfForUpload,
}: {
  onSuccess: (transactionId?: string) => void;
  pdfData?: PdfPayload;
  thumbnailUrl?: string;
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
}) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<"idle" | "checkout" | "saving" | "done">("idle");
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [userCountry, setUserCountry] = useState("ES");
  const [userPostalCode, setUserPostalCode] = useState("");
  const stripeConfigQ = trpc.subscription.stripeConfig.useQuery();
  const createCheckoutSession = trpc.subscription.createCheckoutSession.useMutation();
  const confirmSetup = trpc.subscription.confirmSetup.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    fetch("/api/geo").then(r => r.json()).then(data => {
      if (data.country) setUserCountry(data.country.toUpperCase());
      if (data.postalCode) setUserPostalCode(data.postalCode);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (stripeConfigQ.data?.publishableKey) {
      setStripePromise(loadStripe(stripeConfigQ.data.publishableKey));
    }
  }, [stripeConfigQ.data?.publishableKey]);

  useEffect(() => {
    if (!stripeConfigQ.data?.publishableKey || clientSecret) return;
    createCheckoutSession.mutateAsync().then((res) => {
      if (res.clientSecret) setClientSecret(res.clientSecret);
    }).catch((err) => {
      console.error("[Stripe] Failed to create checkout session:", err);
      toast.error("Error loading payment form. Please try again.");
    });
  }, [stripeConfigQ.data?.publishableKey]);

  const uploadPdfViaRest = async (data: { base64: string; name: string; size: number }): Promise<void> => {
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", blob, data.name);
    formData.append("name", data.name);
    const resp = await fetch("/api/documents/upload", { method: "POST", credentials: "include", body: formData });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  };

  const claimTempPdf = async (tempKey: string, name: string): Promise<void> => {
    const resp = await fetch("/api/documents/claim-temp", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempKey, name }),
    });
    if (!resp.ok) throw new Error(`Claim failed: ${resp.status}`);
  };

  const handleComplete = useCallback(async () => {
    setIsProcessing(true);
    setProgressStep("checkout");
    try {
      await confirmSetup.mutateAsync();
      await utils.subscription.status.invalidate();
      setProgressStep("saving");

      if (pdfData && "tempKey" in pdfData) {
        try { await claimTempPdf(pdfData.tempKey, pdfData.name); await utils.documents.list.invalidate(); } catch {}
      } else {
        let resolvedPdfData = pdfData as { base64: string; name: string; size: number } | undefined;
        if (!resolvedPdfData && buildPdfForUpload) {
          try { resolvedPdfData = (await buildPdfForUpload()) ?? undefined; } catch {}
        }
        if (resolvedPdfData) {
          try { await uploadPdfViaRest(resolvedPdfData); await utils.documents.list.invalidate(); } catch {}
        }
      }

      setProgressStep("done");
      onSuccess();
    } catch (err: unknown) {
      setProgressStep("idle");
      toast.error(err instanceof Error ? err.message : "Error processing payment");
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, buildPdfForUpload, onSuccess, utils]);

  return (
    <div className="flex flex-col md:flex-row min-h-0">
      {/* ── Left: PDF Preview ── */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[#f4f5f7] p-8" style={{ minWidth: 260, maxWidth: 280 }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-5 w-full">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Your document is ready!</p>
        </div>
        {/* PDF thumbnail */}
        <div
          className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center mb-3"
          style={{ aspectRatio: "0.707", maxHeight: 220 }}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Document preview" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-8 bg-red-50 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-[9px] font-bold">PDF</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-1.5 bg-slate-100 rounded w-full" />
                  <div className="h-1.5 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-1.5 bg-slate-50 rounded" style={{ width: `${65 + (i % 3) * 12}%` }} />
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center leading-tight truncate w-full font-medium">
          {pdfData?.name ?? "document.pdf"}
        </p>

        {/* Processing steps */}
        {isProcessing && (
          <div className="mt-5 w-full space-y-2">
            {([
              { key: "checkout", label: "Processing payment..." },
              { key: "saving",   label: "Saving document..." },
              { key: "done",     label: "All done!" },
            ] as const).map((step) => {
              const order = ["checkout", "saving", "done"] as const;
              const curr = order.indexOf(progressStep as typeof order[number]);
              const idx = order.indexOf(step.key);
              return (
                <div key={step.key} className="flex items-center gap-2">
                  {idx < curr ? (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                  ) : idx === curr ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1B5E20]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                  )}
                  <span className={`text-xs font-medium ${idx < curr ? "text-green-600" : idx === curr ? "text-[#1B5E20]" : "text-slate-300"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: Payment form ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="px-6 py-5 space-y-5">
          {/* Pricing breakdown */}
          <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, #1B5E20, #166534)" }}>
            <p className="text-sm text-green-100 mb-1">{t.paywall_your_pdf}</p>
            <p className="text-3xl font-extrabold text-white tracking-tight">{t.paywall_only_for}</p>
          </div>

          {/* Stripe form */}
          {stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, locale: "en", appearance: { theme: "stripe", variables: { colorPrimary: "#1B5E20", borderRadius: "10px" } } }}>
              <PaymentForm onSuccess={handleComplete} userCountry={userCountry} userPostalCode={userPostalCode} />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-[#1B5E20]" />
            </div>
          )}
        </div>
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
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailMode, setEmailMode] = useState<"register" | "login">("register");
  const [emailLoading, setEmailLoading] = useState(false);
  const registerMutation = trpc.auth.register.useMutation();
  const loginMutation = trpc.auth.login.useMutation();
  const { refresh } = useAuth();

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;
  const effectivePdfData = pdfData ?? pendingEditedPdf ?? undefined;

  const handleGoogleLogin = async () => {
    // Save the edited PDF (with annotations) if available, otherwise save the original
    if (pdfData) {
      try { await saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size); } catch {}
    } else if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    setPendingPaywall(true);
    sessionStorage.setItem("cloudpdf_pending_action", "download");
    const returnPath = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnPath)}`;
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) { toast.error(t.paywall_enter_email); return; }
    if (!passwordInput || passwordInput.length < 6) { toast.error(t.paywall_password_min); return; }
    setEmailLoading(true);
    try {
      if (emailMode === "register") {
        await registerMutation.mutateAsync({ email: emailInput.trim(), password: passwordInput, name: nameInput.trim() || undefined });
      } else {
        await loginMutation.mutateAsync({ email: emailInput.trim(), password: passwordInput });
      }
      await refresh();
      const docToSave = (effectivePdfData && "base64" in effectivePdfData ? effectivePdfData : null) ?? (buildPdfForUpload ? await buildPdfForUpload() : null);
      if (docToSave && "base64" in docToSave) {
        try {
          const binaryStr = atob(docToSave.base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          const fd = new FormData();
          fd.append("file", blob, docToSave.name);
          fd.append("name", docToSave.name);
          await fetch("/api/documents/auto-save", { method: "POST", credentials: "include", body: fd });
        } catch {}
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePaymentSuccess = (transactionId?: string) => {
    clearPendingEditedPdf();
    onClose();
    if (onPaymentSuccess) onPaymentSuccess(transactionId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: currentStep === "plans" ? 760 : 480, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-slate-100 transition-colors border border-slate-200"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* ── Auth Choice ── */}
        {currentStep === "auth-choice" && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1B5E20] flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.paywall_create_account}</h2>
              <p className="text-sm text-gray-500">{t.paywall_sign_up_seconds}</p>
            </div>
            <div className="space-y-3 max-w-sm mx-auto">
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 bg-white hover:border-gray-400 transition-all">
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
              <button onClick={() => setStep("email-form")} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 bg-white hover:border-gray-400 transition-all">
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
              <div className="w-14 h-14 rounded-2xl bg-[#1B5E20] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{emailMode === "register" ? t.paywall_register : t.paywall_login}</h2>
              <p className="text-sm text-gray-500">{emailMode === "register" ? t.paywall_sign_up_seconds : t.paywall_enter_email}</p>
            </div>
            <div className="max-w-sm mx-auto space-y-3">
              {emailMode === "register" && (
                <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t.paywall_name} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]" />
              )}
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder={t.paywall_password} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]" onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {emailMode === "register" && <p className="text-xs text-gray-400">{t.paywall_password_min}</p>}
              <button onClick={handleEmailSubmit} disabled={emailLoading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1B5E20] text-white font-bold text-sm hover:bg-[#14532d] transition-colors disabled:opacity-60">
                {emailLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> {emailMode === "register" ? t.paywall_registering : t.paywall_logging_in}</> : <><ArrowRight className="w-4 h-4" /> {emailMode === "register" ? t.paywall_register : t.paywall_login}</>}
              </button>
              <div className="text-center text-sm text-gray-500 pt-1">
                {emailMode === "register" ? <>{t.paywall_have_account}{" "}<button onClick={() => setEmailMode("login")} className="text-[#1B5E20] font-semibold hover:underline">{t.paywall_login}</button></> : <>{t.paywall_no_account}{" "}<button onClick={() => setEmailMode("register")} className="text-[#1B5E20] font-semibold hover:underline">{t.paywall_register}</button></>}
              </div>
              <button onClick={() => setStep("auth-choice")} className="w-full text-sm text-gray-400 hover:text-gray-700 py-2 transition-colors">{t.paywall_back}</button>
            </div>
          </div>
        )}

        {/* ── Payment step ── */}
        {currentStep === "plans" && (
          <StripeCheckoutForm
            onSuccess={handlePaymentSuccess}
            pdfData={effectivePdfData}
            thumbnailUrl={thumbnailUrl}
            buildPdfForUpload={buildPdfForUpload}
          />
        )}
      </div>
    </div>
  );
}

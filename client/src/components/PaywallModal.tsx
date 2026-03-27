/*
 * PaywallModal — Paddle Inline Checkout embebido
 * Diseño tipo Stripe: limpio, profesional
 * Sin checkbox propio — Paddle ya gestiona los términos
 * Checkout visible y usable inmediatamente
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight, Eye, EyeOff, Lock, Shield, FileText, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { fireConversionEvents, fireBeginCheckout } from "@/lib/conversionTracking";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";

// PDF data can be base64 (from editor) or tempKey (from S3 temp upload after login redirect)
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
  /** Called when pdfData is missing — builds the annotated PDF on demand */
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
}

type Step = "auth-choice" | "email-form" | "plans";

// ── Paddle Inline Checkout form ────────────────────────────────────────
function PaddleCheckoutForm({
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
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<"idle" | "checkout" | "saving" | "done">("idle");
  const [paddleReady, setPaddleReady] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const paddleInitialized = useRef(false);
  const checkoutOpened = useRef(false);

  const confirmPaddleCheckout = trpc.subscription.confirmPaddleCheckout.useMutation();
  const paddleConfigQ = trpc.subscription.paddleConfig.useQuery();
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

  // Handle post-checkout success (upload PDF, confirm subscription)
  const handleCheckoutComplete = useCallback(async (eventData: any) => {
    setIsLoading(true);
    setProgressStep("checkout");
    try {
      const transactionId = eventData?.transaction_id || eventData?.data?.transaction_id || "";
      const subscriptionId = eventData?.subscription_id || eventData?.data?.subscription_id || "";
      const customerId = eventData?.customer_id || eventData?.data?.customer_id || "";

      // 1. Confirm subscription in our DB
      await confirmPaddleCheckout.mutateAsync({
        transactionId,
        subscriptionId,
        customerId,
      });
      await utils.subscription.status.invalidate();

      // 2. Upload PDF now that subscription is active
      setProgressStep("saving");

      if (pdfData && "tempKey" in pdfData) {
        try {
          await claimTempPdf(pdfData.tempKey, pdfData.name);
          await utils.documents.list.invalidate();
        } catch (claimErr) {
          console.error("[PaywallModal] claimTempPdf failed:", claimErr);
        }
      } else {
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
            }
          }
        }
      }

      setProgressStep("done");
      toast.success(t.paywall_doc_ready + " " + t.paywall_processing);

      // Fire Google Ads conversion + GA4 purchase events
      fireConversionEvents(transactionId || subscriptionId);

      onSuccess(transactionId || subscriptionId);
    } catch (err: unknown) {
      setProgressStep("idle");
      const message = err instanceof Error ? err.message : "Error al procesar el pago";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [pdfData, buildPdfForUpload, onSuccess, confirmPaddleCheckout, utils, t]);

  // Fire begin_checkout event when checkout form mounts
  useEffect(() => {
    fireBeginCheckout();
  }, []);

  // Initialize Paddle.js IMMEDIATELY
  useEffect(() => {
    if (checkoutOpen || !paddleConfigQ.data?.clientToken || !paddleConfigQ.data?.priceId) return;

    const Paddle = (window as any).Paddle;
    if (!Paddle) {
      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = () => initAndOpen();
      script.onerror = () => {
        console.error("[Paddle] Failed to load Paddle.js");
        toast.error("Error loading payment system. Please refresh.");
      };
      document.head.appendChild(script);
      return;
    }

    initAndOpen();

    function initAndOpen() {
      const P = (window as any).Paddle;
      if (!P) return;

      const clientToken = paddleConfigQ.data!.clientToken;
      const priceId = paddleConfigQ.data!.priceId;
      const trialPriceId = paddleConfigQ.data!.trialPriceId;

      try {
        if (!paddleInitialized.current) {
          P.Initialize({
            token: clientToken,
            checkout: {
              settings: {
                displayMode: "inline",
                frameTarget: "paddle-checkout-container",
                frameInitialHeight: "450",
                frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
                locale: lang || "en",
              },
            },
            eventCallback: (event: any) => {
              console.log("[Paddle] Event:", event.name, event);
              if (event.name === "checkout.loaded") setPaddleReady(true);
              if (event.name === "checkout.completed") handleCheckoutComplete(event.data);
              if (event.name === "checkout.error") {
                console.error("[Paddle] Checkout error:", event);
                toast.error("Error en el proceso de pago. Inténtalo de nuevo.");
              }
            },
          });
          paddleInitialized.current = true;
        } else {
          P.Update({
            eventCallback: (event: any) => {
              console.log("[Paddle] Event:", event.name, event);
              if (event.name === "checkout.loaded") setPaddleReady(true);
              if (event.name === "checkout.completed") handleCheckoutComplete(event.data);
              if (event.name === "checkout.error") {
                console.error("[Paddle] Checkout error:", event);
                toast.error("Error en el proceso de pago. Inténtalo de nuevo.");
              }
            },
          });
        }

        // Pass both prices: one-time trial fee (0.99€) + recurring subscription (49.90€/month with 7-day trial)
        const items: Array<{ priceId: string; quantity: number }> = [];
        if (trialPriceId) {
          items.push({ priceId: trialPriceId, quantity: 1 });
        }
        items.push({ priceId, quantity: 1 });

        P.Checkout.open({
          items,
          customer: {
            email: user?.email || undefined,
          },
          customData: {
            user_id: user?.id?.toString() || "",
            user_email: user?.email || "",
            user_name: user?.name || "",
          },
          settings: {
            locale: lang || "en",
            allowLogout: false,
            showAddDiscounts: true,
          },
        });

        setCheckoutOpen(true);
        checkoutOpened.current = true;
        console.log("[Paddle] Inline checkout opened");
      } catch (err) {
        console.error("[Paddle] Init/open error:", err);
        toast.error("Error opening payment form. Please try again.");
      }
    }
  }, [checkoutOpen, paddleConfigQ.data, user, handleCheckoutComplete]);

  // Close Paddle checkout when component unmounts
  useEffect(() => {
    return () => {
      if (checkoutOpened.current && (window as any).Paddle) {
        try {
          (window as any).Paddle.Checkout.close();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-0" style={{ minHeight: 520 }}>
      {/* ── Left column: Order summary ── */}
      <div
        className="flex flex-col justify-between p-6 md:p-8"
        style={{
          minWidth: 280,
          maxWidth: 320,
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <div>
          {/* Document preview */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-14 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {pdfData?.name ?? "documento.pdf"}
              </p>
              <p className="text-xs text-slate-400">{t.paywall_pdf_edited}</p>
            </div>
          </div>

          {/* Trial badge — prominent */}
          <div
            className="rounded-xl p-4 mb-6 text-center"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">{t.paywall_free_badge}</span>
            </div>
            <p className="text-3xl font-extrabold text-white mb-2">{t.paywall_free_price}</p>
            <p className="text-xs text-amber-300/70 mt-1.5">
              {t.paywall_free_cancel}
            </p>
          </div>

          {/* Trust signals */}
          <div className="space-y-2.5">
            {[
              { icon: Shield, text: t.paywall_secure },
              { icon: CreditCard, text: t.paywall_instant },
              { icon: Sparkles, text: t.paywall_cancel },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress steps — visible during payment processing */}
        {isLoading && (
          <div className="mt-6 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {([
              { key: "checkout", label: t.paywall_progress_processing },
              { key: "saving", label: t.paywall_progress_saving },
              { key: "done", label: t.paywall_progress_done },
            ] as const).map((step) => {
              const stepOrder = ["checkout", "saving", "done"] as const;
              const currentIdx = stepOrder.indexOf(progressStep as typeof stepOrder[number]);
              const stepIdx = stepOrder.indexOf(step.key);
              const isDone = stepIdx < currentIdx;
              const isActive = stepIdx === currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-2 py-1">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {isDone ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full" style={{ border: "1.5px solid rgba(255,255,255,0.15)" }} />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    isDone ? "text-green-400" : isActive ? "text-blue-400" : "text-slate-500"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right column: Paddle Inline Checkout ── */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-white">
        {/* Loading state while Paddle loads */}
        {!paddleReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">{t.paywall_loading_form}</p>
            </div>
          </div>
        )}

        {/* Paddle inline checkout renders here — NO overlay, directly usable */}
        <div
          className="paddle-checkout-container flex-1"
          style={{
            minHeight: 450,
            opacity: paddleReady ? 1 : 0,
            transition: "opacity 0.3s ease",
            padding: "8px 16px",
          }}
        />
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
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    if (pdfData) {
      try { await saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size); } catch {}
    }
    setPendingPaywall(true);
    sessionStorage.setItem("pdfup_pending_action", "download");
    const returnPath = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnPath)}`;
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error(t.paywall_enter_email);
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      toast.error(t.paywall_password_min);
      return;
    }
    setEmailLoading(true);
    try {
      if (emailMode === "register") {
        await registerMutation.mutateAsync({
          email: emailInput.trim(),
          password: passwordInput,
          name: nameInput.trim() || undefined,
        });
      } else {
        await loginMutation.mutateAsync({
          email: emailInput.trim(),
          password: passwordInput,
        });
      }
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
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
        style={{ maxWidth: currentStep === "plans" ? 880 : 520, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: currentStep === "plans" ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}
        >
          <X className={`w-4 h-4 ${currentStep === "plans" ? "text-slate-400" : "text-gray-500"}`} />
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

        {/* ── Email Form (register/login) ── */}
        {currentStep === "email-form" && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1a3c6e] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {emailMode === "register" ? t.paywall_register : t.paywall_login}
              </h2>
              <p className="text-sm text-gray-500">
                {emailMode === "register" ? t.paywall_sign_up_seconds : t.paywall_enter_email}
              </p>
            </div>
            <div className="max-w-sm mx-auto space-y-3">
              {emailMode === "register" && (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t.paywall_name}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c6e]"
                />
              )}
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c6e]"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={t.paywall_password}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c6e]"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {emailMode === "register" && (
                <p className="text-xs text-gray-400">{t.paywall_password_min}</p>
              )}
              <button
                onClick={handleEmailSubmit}
                disabled={emailLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1a3c6e] text-white font-bold text-sm hover:bg-[#15305a] transition-colors disabled:opacity-60"
              >
                {emailLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {emailMode === "register" ? t.paywall_registering : t.paywall_logging_in}</>
                ) : (
                  <><ArrowRight className="w-4 h-4" /> {emailMode === "register" ? t.paywall_register : t.paywall_login}</>
                )}
              </button>
              <div className="text-center text-sm text-gray-500 pt-1">
                {emailMode === "register" ? (
                  <>{t.paywall_have_account}{" "}<button onClick={() => setEmailMode("login")} className="text-[#1a3c6e] font-semibold hover:underline">{t.paywall_login}</button></>
                ) : (
                  <>{t.paywall_no_account}{" "}<button onClick={() => setEmailMode("register")} className="text-[#1a3c6e] font-semibold hover:underline">{t.paywall_register}</button></>
                )}
              </div>
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
          <PaddleCheckoutForm
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

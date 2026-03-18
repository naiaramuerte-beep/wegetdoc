/**
 * PaywallModal — Flujo de descarga estilo pdfe.com:
 * 1. Si no está logueado → pantalla de auth (Google / Email)
 * 2. Si está logueado → pantalla de pago con Stripe Elements embebido:
 *    - "Tu documento está listo"
 *    - 100% Descuento para nuevos usuarios (0€ hoy)
 *    - Formulario de tarjeta inline (CardElement de Stripe)
 *    - Texto legal: "Si no cancelas antes de 7 días, se te cobrará 49,95€/mes"
 *    - Botón "Pagar y descargar" → confirma SetupIntent → crea suscripción → descarga
 */
import { useState, useEffect } from "react";
import { X, Check, Lock, Zap, Star, Shield, ArrowRight, Loader2, Mail, CreditCard, FileText } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe.js once
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Context: what action triggered the paywall */
  action?: string;
  /** PDF data to upload before checkout */
  pdfData?: { base64: string; name: string; size: number };
  /** Called after successful payment so parent can trigger download */
  onPaymentSuccess?: () => void;
}

type Step = "auth-choice" | "email-form" | "plans";

const FEATURES = [
  "Descargar PDFs editados sin marca de agua",
  "Añadir texto, firmas y anotaciones",
  "Comprimir, fusionar y dividir PDFs",
  "Convertir PDF a JPG / PNG",
  "Historial de documentos en la nube",
  "Cancelación en cualquier momento",
];

// ── Inner component that uses Stripe hooks (must be inside <Elements>) ──────
function CheckoutForm({
  onSuccess,
  onClose,
  pdfData,
}: {
  onSuccess: () => void;
  onClose: () => void;
  pdfData?: { base64: string; name: string; size: number };
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);

  const createSetupIntent = trpc.subscription.createSetupIntent.useMutation();
  const confirmSubscription = trpc.subscription.confirmSubscription.useMutation();
  const uploadDocument = trpc.documents.upload.useMutation();
  const utils = trpc.useUtils();

  // Create SetupIntent when component mounts
  useEffect(() => {
    createSetupIntent.mutateAsync().then((result) => {
      setClientSecret(result.clientSecret);
      setCustomerId(result.customerId);
    }).catch((err) => {
      console.error("Failed to create SetupIntent:", err);
      toast.error("Error al inicializar el formulario de pago");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!stripe || !elements || !clientSecret || !customerId) {
      toast.error("El formulario de pago no está listo. Espera un momento.");
      return;
    }
    if (!agreed) {
      toast.error("Debes aceptar los términos y condiciones para continuar");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Confirm the SetupIntent with the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        toast.error(error.message || "Error al procesar la tarjeta");
        setIsLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        toast.error("No se pudo obtener el método de pago");
        setIsLoading(false);
        return;
      }

      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      // 2. Upload PDF to S3 if provided
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
          // Continue even if upload fails
        }
      }

      // 3. Create subscription with trial
      await confirmSubscription.mutateAsync({
        paymentMethodId,
        customerId,
      });

      // 4. Invalidate subscription status cache
      await utils.subscription.status.invalidate();

      toast.success("¡Suscripción activada! Descargando tu documento...");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar el pago";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-6 py-4">
      {/* Discount badge + price */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-xl" style={{ backgroundColor: "oklch(0.97 0.005 250)", border: "1px solid oklch(0.90 0.01 250)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}>
            <Zap className="w-5 h-5" style={{ color: "oklch(0.55 0.22 260)" }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>100% Descuento</p>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Nuevo usuario</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold" style={{ color: "oklch(0.45 0.20 150)" }}>0,00 €</p>
          <p className="text-xs line-through" style={{ color: "oklch(0.65 0.02 250)" }}>49,95 €</p>
        </div>
      </div>

      {/* Card number field */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.35 0.02 250)" }}>
          Número de tarjeta
        </label>
        <div
          className="border rounded-lg px-3 py-3"
          style={{ borderColor: cardReady ? "oklch(0.55 0.22 260)" : "oklch(0.80 0.02 250)", backgroundColor: "#fff", transition: "border-color 0.2s" }}
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
              onChange={(e) => setCardReady(e.complete && !e.error)}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.60 0.02 250)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando formulario de pago...
            </div>
          )}
        </div>
        {/* Card brand icons */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-visa.svg" alt="Visa" className="h-5 opacity-60" />
          <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-mastercard.svg" alt="Mastercard" className="h-5 opacity-60" />
          <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-amex.svg" alt="Amex" className="h-5 opacity-60" />
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs" style={{ color: "oklch(0.55 0.02 250)" }}>
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
          Pago seguro SSL
        </span>
        <span className="flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
          Visa / Mastercard
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
          Cancela cuando quieras
        </span>
      </div>

      {/* Legal checkbox */}
      <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer"
          style={{ accentColor: "oklch(0.55 0.22 260)" }}
        />
        <span className="text-xs leading-relaxed" style={{ color: "oklch(0.45 0.02 250)" }}>
          Al marcar esta casilla, aceptas nuestros{" "}
          <a href="/terms" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>Términos y Condiciones</a>{" "}
          y nuestra{" "}
          <a href="/privacy" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>Política de privacidad</a>.{" "}
          Si no cancelas al menos 1 hora antes de que termine el período de prueba de 7 días, se te cobrarán automáticamente{" "}
          <strong>49,95 € al mes</strong> hasta que canceles en la configuración de tu cuenta. Soporte:{" "}
          <a href="mailto:support@editpdf.online" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>support@editpdf.online</a>
        </span>
      </label>

      {/* CTA button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !agreed || !clientSecret}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-base transition-all duration-200"
        style={{
          backgroundColor: isLoading || !agreed || !clientSecret ? "oklch(0.70 0.10 260)" : "oklch(0.20 0.04 250)",
          boxShadow: agreed && !isLoading && clientSecret ? "0 4px 20px oklch(0.20 0.04 250 / 0.4)" : "none",
          cursor: agreed && !isLoading && clientSecret ? "pointer" : "not-allowed",
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pagar y descargar
          </>
        )}
      </button>
    </div>
  );
}

// ── Main modal component ──────────────────────────────────────────────────────
export default function PaywallModal({ isOpen, onClose, action = "descargar", pdfData, onPaymentSuccess }: PaywallModalProps) {
  const { isAuthenticated } = useAuth();
  const { savePdfToSession, setPendingPaywall, pendingFile } = usePdfFile();
  const [step, setStep] = useState<Step>(isAuthenticated ? "plans" : "auth-choice");
  const [emailInput, setEmailInput] = useState("");

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;

  const handleGoogleLogin = async () => {
    if (pendingFile) {
      try { await savePdfToSession(pendingFile); } catch {}
    }
    setPendingPaywall(true);
    window.location.href = getLoginUrl();
  };

  const handleEmailContinue = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Por favor, introduce un email válido");
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
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "oklch(1 0 0)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "oklch(0.92 0.01 250)", color: "oklch(0.45 0.02 250)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Step: Auth Choice ── */}
        {currentStep === "auth-choice" && (
          <>
            <div
              className="px-8 pt-8 pb-6 text-center"
              style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.25 0.06 260) 100%)" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.2)" }}>
                <Lock className="w-7 h-7" style={{ color: "oklch(0.75 0.18 260)" }} />
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">
                Para {action} necesitas una cuenta
              </h2>
              <p className="text-sm" style={{ color: "oklch(0.70 0.03 250)" }}>
                Crea tu cuenta gratis en segundos y elige un plan para continuar
              </p>
            </div>
            <div className="p-8">
              <div className="space-y-3 max-w-sm mx-auto">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all hover:shadow-md"
                  style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.25 0.03 250)", backgroundColor: "white" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)"; }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">o</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <button
                  onClick={() => setStep("email-form")}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all hover:shadow-md"
                  style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.25 0.03 250)", backgroundColor: "white" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)"; }}
                >
                  <Mail className="w-4 h-4" />
                  Continuar con Email
                </button>
              </div>
              <p className="text-center text-xs mt-5" style={{ color: "oklch(0.60 0.02 250)" }}>
                Al continuar, aceptas nuestros{" "}
                <a href="/terms" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>Términos de servicio</a>{" "}
                y{" "}
                <a href="/privacy" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>Política de privacidad</a>
              </p>
            </div>
          </>
        )}

        {/* ── Step: Email Form ── */}
        {currentStep === "email-form" && (
          <>
            <div className="px-8 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.25 0.06 260) 100%)" }}>
              <h2 className="text-2xl font-extrabold text-white mb-2">Introduce tu email</h2>
              <p className="text-sm" style={{ color: "oklch(0.70 0.03 250)" }}>Te enviaremos un enlace para acceder</p>
            </div>
            <div className="p-8">
              <div className="max-w-sm mx-auto space-y-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                />
                <button
                  onClick={handleEmailContinue}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
                >
                  <ArrowRight className="w-4 h-4" />
                  Continuar
                </button>
                <button onClick={() => setStep("auth-choice")} className="w-full text-sm text-slate-500 hover:text-slate-700 py-2">
                  ← Volver
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: Plans (pdfe.com style — inline Stripe Elements) ── */}
        {currentStep === "plans" && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid oklch(0.92 0.01 250)" }}>
              <div className="flex items-center gap-3">
                {/* Document preview */}
                <div className="w-12 h-16 rounded border-2 flex items-center justify-center relative flex-shrink-0" style={{ borderColor: "oklch(0.75 0.10 260)", backgroundColor: "oklch(0.97 0.005 250)" }}>
                  <FileText className="w-6 h-6" style={{ color: "oklch(0.55 0.22 260)" }} />
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "oklch(0.45 0.20 150)" }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "oklch(0.45 0.20 150)" }}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <p className="font-bold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>¡Tu documento está listo!</p>
                  </div>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Un paso más para descargarlo</p>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="px-6 pt-3 pb-2">
              <div className="grid grid-cols-2 gap-1 mb-3">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.35 0.02 250)" }}>
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Stripe Elements checkout form */}
            <Elements stripe={stripePromise}>
              <CheckoutForm
                onSuccess={handlePaymentSuccess}
                onClose={onClose}
                pdfData={pdfData}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}

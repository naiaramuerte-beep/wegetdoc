/**
 * PaywallModal — Flujo de descarga:
 * 1. Clic en Descargar → Modal: "Descarga con Google" o "Descarga con Email"
 * 2. Si elige Google → OAuth login → vuelve con cuenta creada → muestra planes de pago
 * 3. Si ya está logueado pero no tiene premium → muestra planes de pago directamente
 * 4. Si ya tiene premium → descarga directa (no se muestra este modal)
 */
import { useState } from "react";
import { X, Check, Lock, Zap, Star, Shield, ArrowRight, Loader2, Mail, Chrome } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Context: what action triggered the paywall */
  action?: string;
}

type Step = "auth-choice" | "email-form" | "plans";

const PLANS = [
  {
    id: "trial" as const,
    badge: "MÁS POPULAR",
    name: "Prueba 7 días",
    price: "0,99 €",
    period: "pago único",
    description: "Acceso completo durante 7 días",
    features: [
      "Descargar PDFs editados",
      "Añadir texto y firmas",
      "Comprimir y fusionar PDFs",
      "Dividir documentos",
      "Convertir a JPG",
      "Sin marca de agua",
    ],
    highlight: true,
    cta: "Empezar prueba por 0,99 €",
  },
  {
    id: "monthly" as const,
    badge: null,
    name: "Plan Mensual",
    price: "9,99 €",
    period: "al mes",
    description: "Acceso ilimitado sin restricciones",
    features: [
      "Todo lo del plan de prueba",
      "Uso ilimitado",
      "Soporte prioritario",
      "Historial de documentos",
      "Almacenamiento en la nube",
      "Cancelación en cualquier momento",
    ],
    highlight: false,
    cta: "Suscribirse por 9,99 €/mes",
  },
];

export default function PaywallModal({ isOpen, onClose, action = "descargar" }: PaywallModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>(isAuthenticated ? "plans" : "auth-choice");
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "monthly">("trial");
  const [isLoading, setIsLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const createCheckout = trpc.subscription.createCheckout.useMutation();

  if (!isOpen) return null;

  // Determine initial step based on auth state
  const currentStep = isAuthenticated ? "plans" : step;

  const handleGoogleLogin = () => {
    // Save current URL to return after login
    window.location.href = getLoginUrl();
  };

  const handleEmailContinue = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Por favor, introduce un email válido");
      return;
    }
    // Redirect to login with email hint
    window.location.href = getLoginUrl();
  };

  const handleProceed = async () => {
    if (!isAuthenticated) {
      handleGoogleLogin();
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({
        plan: selectedPlan,
        origin: window.location.origin,
      });
      if (result.url) {
        toast.info("Redirigiendo al pago seguro...");
        window.open(result.url, "_blank");
        onClose();
      }
    } catch (err) {
      toast.error("Error al crear la sesión de pago. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "oklch(1 0 0)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "oklch(0.92 0.01 250)", color: "oklch(0.45 0.02 250)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.25 0.06 260) 100%)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.2)" }}
          >
            <Lock className="w-7 h-7" style={{ color: "oklch(0.75 0.18 260)" }} />
          </div>
          <h2
            className="text-2xl font-extrabold text-white mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {currentStep === "plans"
              ? "Elige tu plan"
              : `Para ${action} necesitas una cuenta`}
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.70 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}>
            {currentStep === "plans"
              ? "Accede a todas las herramientas PDF sin límites"
              : "Crea tu cuenta gratis en segundos y elige un plan para continuar"}
          </p>
        </div>

        {/* Trust badges */}
        <div
          className="flex items-center justify-center gap-6 px-8 py-3 text-xs"
          style={{
            backgroundColor: "oklch(0.97 0.005 250)",
            borderBottom: "1px solid oklch(0.90 0.01 250)",
            color: "oklch(0.45 0.02 250)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
            Pago 100% seguro
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
            Acceso inmediato
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.22 260)" }} />
            Cancela cuando quieras
          </span>
        </div>

        {/* ── Step: Auth Choice ── */}
        {currentStep === "auth-choice" && (
          <div className="p-8">
            <div className="space-y-3 max-w-sm mx-auto">
              {/* Google button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all hover:shadow-md"
                style={{
                  borderColor: "oklch(0.88 0.01 250)",
                  color: "oklch(0.25 0.03 250)",
                  backgroundColor: "white",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)";
                  e.currentTarget.style.backgroundColor = "oklch(0.97 0.005 260)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)";
                  e.currentTarget.style.backgroundColor = "white";
                }}
              >
                {/* Google SVG icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Descargar con Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">o</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Email button */}
              <button
                onClick={() => setStep("email-form")}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all hover:shadow-md"
                style={{
                  borderColor: "oklch(0.88 0.01 250)",
                  color: "oklch(0.25 0.03 250)",
                  backgroundColor: "white",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)";
                  e.currentTarget.style.backgroundColor = "oklch(0.97 0.005 260)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)";
                  e.currentTarget.style.backgroundColor = "white";
                }}
              >
                <Mail className="w-4.5 h-4.5" />
                Descargar con Email
              </button>
            </div>

            <p
              className="text-center text-xs mt-5"
              style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Al continuar, aceptas nuestros{" "}
              <a href="/terms" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
                Términos de servicio
              </a>{" "}
              y{" "}
              <a href="/privacy" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
                Política de privacidad
              </a>
            </p>
          </div>
        )}

        {/* ── Step: Email Form ── */}
        {currentStep === "email-form" && (
          <div className="p-8">
            <div className="max-w-sm mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tu correo electrónico
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                  autoFocus
                />
              </div>
              <button
                onClick={handleEmailContinue}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  backgroundColor: "oklch(0.55 0.22 260)",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 4px 16px oklch(0.55 0.22 260 / 0.35)",
                }}
              >
                <ArrowRight className="w-4 h-4" />
                Continuar
              </button>
              <button
                onClick={() => setStep("auth-choice")}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
              >
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Plans ── */}
        {currentStep === "plans" && (
          <>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className="relative text-left rounded-xl p-5 transition-all duration-200 border-2"
                  style={{
                    borderColor:
                      selectedPlan === plan.id
                        ? "oklch(0.55 0.22 260)"
                        : "oklch(0.88 0.01 250)",
                    backgroundColor:
                      selectedPlan === plan.id
                        ? "oklch(0.55 0.22 260 / 0.05)"
                        : "oklch(1 0 0)",
                    boxShadow:
                      selectedPlan === plan.id
                        ? "0 0 0 3px oklch(0.55 0.22 260 / 0.15)"
                        : "none",
                  }}
                >
                  {plan.badge && (
                    <span
                      className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className="font-bold text-base"
                        style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
                      >
                        {plan.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 250)" }}>
                        {plan.description}
                      </p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        borderColor:
                          selectedPlan === plan.id ? "oklch(0.55 0.22 260)" : "oklch(0.75 0.02 250)",
                        backgroundColor:
                          selectedPlan === plan.id ? "oklch(0.55 0.22 260)" : "transparent",
                      }}
                    >
                      {selectedPlan === plan.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span
                      className="text-2xl font-extrabold"
                      style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "oklch(0.55 0.02 250)" }}>
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.35 0.02 250)" }}>
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={handleProceed}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-200"
                style={{
                  backgroundColor: isLoading ? "oklch(0.65 0.15 260)" : "oklch(0.55 0.22 260)",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 4px 16px oklch(0.55 0.22 260 / 0.35)",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparando pago...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    {PLANS.find((p) => p.id === selectedPlan)?.cta}
                  </>
                )}
              </button>
              <p
                className="text-center text-xs mt-3"
                style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Al continuar, aceptas nuestros{" "}
                <a href="/terms" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
                  Términos de servicio
                </a>{" "}
                y{" "}
                <a href="/privacy" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
                  Política de privacidad
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

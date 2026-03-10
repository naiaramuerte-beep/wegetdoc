/**
 * PaywallModal — Shown when a non-subscribed user tries to download or use premium tools.
 * Flow: Register/Login → Choose plan → Stripe Checkout
 */
import { useState } from "react";
import { X, Check, Lock, Zap, Star, Shield, ArrowRight, Loader2 } from "lucide-react";
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
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "monthly">("trial");
  const [isLoading, setIsLoading] = useState(false);

  const createCheckout = trpc.subscription.createCheckout.useMutation();

  if (!isOpen) return null;

  const handleProceed = async () => {
    if (!isAuthenticated) {
      // Redirect to login, then come back
      window.location.href = getLoginUrl();
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
            Para {action} necesitas una cuenta
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.70 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}>
            {isAuthenticated
              ? "Elige un plan para acceder a todas las herramientas PDF"
              : "Regístrate gratis y elige un plan para continuar"}
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

        {/* Plans */}
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

        {/* CTA */}
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
            ) : !isAuthenticated ? (
              <>
                <ArrowRight className="w-4 h-4" />
                Registrarse gratis y continuar
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
            <a href="#" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
              Términos de servicio
            </a>{" "}
            y{" "}
            <a href="#" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
              Política de privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

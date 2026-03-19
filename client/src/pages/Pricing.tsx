/* =============================================================
   PDFPro Pricing Page — Deep Navy Pro design
   Two plans: Trial + Monthly, with feature comparison table
   ============================================================= */

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Zap, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const features = [
  { name: "Convertir sin límites", trial: false, monthly: true },
  { name: "Editar sin límites", trial: false, monthly: true },
  { name: "Organizar en carpetas", trial: false, monthly: true },
  { name: "Almacenar PDFs más de 24 horas", trial: false, monthly: true },
  { name: "Colaborar con tu equipo", trial: false, monthly: true },
  { name: "Crear notas", trial: true, monthly: true },
  { name: "Gestionar páginas", trial: true, monthly: true },
  { name: "Firmar documentos", trial: true, monthly: true },
  { name: "Editar imágenes", trial: true, monthly: true },
  { name: "Editar objetos y formas", trial: true, monthly: true },
  { name: "Resaltar textos", trial: true, monthly: true },
  { name: "Proteger tus documentos", trial: true, monthly: true },
];

const pricingFaqs = [
  {
    question: "¿Puedo probar todas las funciones durante el período de prueba?",
    answer:
      "Durante el período de prueba de 7 días tendrás acceso a las funciones básicas de edición. Para acceder a todas las funciones sin límites, como conversiones ilimitadas y almacenamiento extendido, necesitarás el plan mensual.",
  },
  {
    question: "¿Qué ocurre después de que terminen los 7 días de prueba?",
    answer:
      "Al finalizar el período de prueba, tu plan se renovará automáticamente al plan mensual. Puedes cancelar en cualquier momento antes de que finalice el período de prueba para evitar el cargo.",
  },
  {
    question: "¿Hay algún compromiso con la suscripción mensual?",
    answer:
      "No, no hay ningún compromiso a largo plazo. Puedes cancelar tu suscripción mensual en cualquier momento y seguirás teniendo acceso hasta el final del período de facturación actual.",
  },
  {
    question: "¿Puedo cancelar mi suscripción en cualquier momento?",
    answer:
      "Sí, puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta. No hay penalizaciones por cancelación.",
  },
  {
    question: "¿Puedo solicitar un reembolso por una suscripción no utilizada?",
    answer:
      "Evaluamos las solicitudes de reembolso caso por caso. Si tienes algún problema con tu suscripción, contacta con nuestro equipo de soporte y haremos todo lo posible para ayudarte.",
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const createCheckout = trpc.subscription.createCheckout.useMutation();

  const handleSubscribe = async (plan: "trial" | "monthly") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingPlan(plan);
    try {
      const result = await createCheckout.mutateAsync({
        plan,
        origin: window.location.origin,
      });
      if (result.url) {
        toast.info("Redirigiendo al pago seguro...");
        window.open(result.url, "_blank");
      }
    } catch {
      toast.error("Error al procesar el pago. Inténtalo de nuevo.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 text-center">
        <div className="container max-w-3xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-extrabold mb-4"
            style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
          >
            Elige el plan que mejor se adapte a ti
          </h1>
          <p
            className="text-base"
            style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Comienza gratis y actualiza cuando lo necesites
          </p>
        </div>
      </section>

      {/* ── PLANS ────────────────────────────────────────── */}
      <section className="pb-16">
        <div className="container max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Trial Plan */}
            <div
              className="relative rounded-2xl p-8 flex flex-col"
              style={{
                backgroundColor: "oklch(1 0 0)",
                border: "2px solid oklch(0.55 0.22 260)",
                boxShadow: "0 0 0 4px oklch(0.55 0.22 260 / 0.08)",
              }}
            >
              {/* Most popular badge */}
              <div className="absolute -top-3 left-6">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{
                    backgroundColor: "oklch(0.55 0.22 260)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Zap className="w-3 h-3" />
                  Más popular
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.1)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "oklch(0.55 0.22 260)" }} />
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  Plan de prueba
                </h2>
              </div>

              <div className="mb-4">
                <span
                  className="text-4xl font-extrabold"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  0,50 €
                </span>
                <span
                  className="text-sm ml-1"
                  style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  / 7 días
                </span>
              </div>

              <p
                className="text-sm leading-relaxed mb-6 flex-1"
                style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Con el plan de prueba de 7 días, puedes disfrutar del servicio con limitaciones antes de decidir actualizar al siguiente plan para desbloquear todas las funciones. Después de ese período, el plan se renueva automáticamente al plan mensual; puedes cancelar en cualquier momento.
              </p>

              <button
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200"
                style={{
                  backgroundColor: "oklch(0.18 0.04 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")
                }
                onClick={() => handleSubscribe("trial")}
                disabled={loadingPlan === "trial"}
              >
                {loadingPlan === "trial" ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : "Iniciar prueba por 0,50 €"}
              </button>
            </div>

            {/* Monthly Plan */}
            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{
                backgroundColor: "oklch(1 0 0)",
                border: "1px solid oklch(0.88 0.01 250)",
                boxShadow: "0 2px 12px oklch(0.18 0.04 250 / 0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.18 0.04 250 / 0.08)" }}
                >
                  <Crown className="w-4 h-4" style={{ color: "oklch(0.18 0.04 250)" }} />
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  Plan mensual
                </h2>
              </div>

              <div className="mb-4">
                <span
                  className="text-4xl font-extrabold"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  49,90 €
                </span>
                <span
                  className="text-sm ml-1"
                  style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  / mes
                </span>
              </div>

              <p
                className="text-sm mb-1"
                style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Facturado mensualmente
              </p>
              <p
                className="text-sm leading-relaxed mb-6 flex-1"
                style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Se renovará automáticamente a menos que canceles la suscripción.
              </p>

              <button
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  backgroundColor: "transparent",
                  border: "2px solid oklch(0.18 0.04 250)",
                  color: "oklch(0.18 0.04 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "oklch(0.18 0.04 250)";
                }}
                onClick={() => handleSubscribe("monthly")}
                disabled={loadingPlan === "monthly"}
              >
                {loadingPlan === "monthly" ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : "Suscribirse por 9,99 €/mes"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────── */}
      <section
        className="py-16"
        style={{ backgroundColor: "oklch(0.97 0.006 250)" }}
      >
        <div className="container max-w-4xl mx-auto">
          <h2
            className="text-2xl md:text-3xl font-bold mb-8"
            style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
          >
            Descubre qué incluye cada plan
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid oklch(0.88 0.01 250)",
              backgroundColor: "oklch(1 0 0)",
            }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-3 px-6 py-4 border-b"
              style={{ borderColor: "oklch(0.88 0.01 250)" }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: "oklch(0.35 0.02 250)", fontFamily: "'Sora', sans-serif" }}
              >
                Funciones principales
              </div>
              <div
                className="text-sm font-semibold text-center"
                style={{ color: "oklch(0.55 0.22 260)", fontFamily: "'Sora', sans-serif" }}
              >
                Plan de prueba
              </div>
              <div
                className="text-sm font-semibold text-center"
                style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
              >
                Plan mensual
              </div>
            </div>

            {/* Table rows */}
            {features.map((feature, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-3 border-b last:border-0"
                style={{
                  borderColor: "oklch(0.92 0.01 250)",
                  backgroundColor: i % 2 === 0 ? "oklch(1 0 0)" : "oklch(0.99 0.003 250)",
                }}
              >
                <div
                  className="text-sm"
                  style={{ color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {feature.name}
                </div>
                <div className="flex justify-center">
                  {feature.trial ? (
                    <Check className="w-4 h-4" style={{ color: "oklch(0.55 0.22 260)" }} />
                  ) : (
                    <X className="w-4 h-4" style={{ color: "oklch(0.70 0.02 250)" }} />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.monthly ? (
                    <Check className="w-4 h-4" style={{ color: "oklch(0.45 0.18 145)" }} />
                  ) : (
                    <X className="w-4 h-4" style={{ color: "oklch(0.70 0.02 250)" }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl mx-auto">
          <h2
            className="text-2xl md:text-3xl font-bold mb-8"
            style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
          >
            Preguntas frecuentes
          </h2>

          <div className="space-y-3">
            {pricingFaqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${openFaq === i ? "oklch(0.55 0.22 260 / 0.3)" : "oklch(0.88 0.01 250)"}`,
                  backgroundColor: "oklch(1 0 0)",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className="font-semibold text-sm pr-4"
                    style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
                  >
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.50 0.02 250)" }} />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-4 text-sm leading-relaxed"
                    style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

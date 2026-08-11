/* =============================================================
   EditorPDF Pricing Page — Clean White design
   Two plans: Trial + Monthly, with feature comparison table
   Stripe Embedded Checkout inline
   ============================================================= */

import { useState, useEffect, useCallback } from "react";
import { Check, X, ChevronDown, ChevronUp, Zap, Crown, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricing } from "@/lib/usePricing";
import { brandName } from "@/lib/brand";
import PaywallModal from "@/components/PaywallModal";

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const { withPrice } = usePricing();

  const features = [
    { name: t.pricing_feature_convert ?? "Unlimited conversions", trial: false, monthly: true },
    { name: t.pricing_feature_edit ?? "Unlimited editing", trial: false, monthly: true },
    { name: t.pricing_feature_folders ?? "Organize in folders", trial: false, monthly: true },
    { name: t.pricing_feature_storage ?? "Store PDFs over 24 hours", trial: false, monthly: true },
    { name: t.pricing_feature_team ?? "Team collaboration", trial: false, monthly: true },
    { name: t.pricing_feature_notes ?? "Create notes", trial: true, monthly: true },
    { name: t.pricing_feature_pages ?? "Manage pages", trial: true, monthly: true },
    { name: t.pricing_feature_sign ?? "Sign documents", trial: true, monthly: true },
    { name: t.pricing_feature_images ?? "Edit images", trial: true, monthly: true },
    { name: t.pricing_feature_shapes ?? "Edit objects & shapes", trial: true, monthly: true },
    { name: t.pricing_feature_highlight ?? "Highlight text", trial: true, monthly: true },
    { name: t.pricing_feature_protect ?? "Protect documents", trial: true, monthly: true },
  ];

  // Las cuatro preguntas que de verdad decide el comprador antes de pagar:
  // cuándo se le cobra, cómo lo para, si puede recuperar el dinero y qué se
  // lleva. En ese orden — la de cobro primero porque es la que genera las
  // reclamaciones cuando nadie la contesta a tiempo.
  const pricingFaqs = [
    {
      question: t.pricing_faq_q2 ?? "When am I charged?",
      answer: withPrice(t.pricing_faq_a2 ?? "Exactly 24 hours after your purchase, {price} is charged and the subscription becomes monthly."),
    },
    {
      question: t.pricing_faq_q4 ?? "How do I cancel?",
      answer: t.pricing_faq_a4 ?? "Sign in, open the Billing section and press Cancel subscription. Two clicks, no penalty.",
    },
    {
      question: t.pricing_faq_q5 ?? "Can I get a refund?",
      answer: t.pricing_faq_a5 ?? "Yes. You have 14 calendar days from purchase to withdraw and get your money back.",
    },
    {
      question: t.pricing_faq_q1 ?? "What does the trial include?",
      answer: t.pricing_faq_a1 ?? "Full access to every tool for 24 hours, including 2 document downloads.",
    },
  ];

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const currentLang = langMatch ? langMatch[1] : "es";
      window.location.href = `/${currentLang}?login=true`;
      return;
    }
    setShowCheckout(true);
    setTimeout(() => {
      document.getElementById("pricing-checkout")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#ffffff" }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 text-center">
        <div className="container max-w-3xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-extrabold mb-4"
            style={{ color: "#0f172a" }}
          >
            {t.pricing_title}
          </h1>
          <p
            className="text-base"
            style={{ color: "#64748b" }}
          >
            {t.pricing_subtitle}
          </p>

          {/* Resumen de la oferta en una línea, antes de cualquier tabla: lo que
              se paga hoy, lo que se paga después y cómo pararlo. Es lo que el
              comprador viene a buscar, y verlo aquí evita la sorpresa (y la
              reclamación) del primer cargo mensual. */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <span
              className="inline-flex items-center rounded-full px-4 py-2 font-bold text-white"
              style={{ backgroundColor: "#E63946" }}
            >
              {t.pricing_summary_intro}
            </span>
            <span className="font-semibold" style={{ color: "#0f172a" }}>
              {withPrice(t.pricing_summary_then)}
            </span>
            <span style={{ color: "#64748b" }}>·</span>
            <span style={{ color: "#64748b" }}>{t.pricing_summary_cancel}</span>
          </div>
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
                backgroundColor: "#FFFFFF",
                border: "2px solid #E63946",
                boxShadow: "0 0 0 4px rgba(10, 10, 11, 0.08)",
              }}
            >
              <div className="absolute -top-3 left-6">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{
                    backgroundColor: "#E63946",
                  }}
                >
                  <Zap className="w-3 h-3" />
                  {t.pricing_popular ?? "Most popular"}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(10, 10, 11, 0.1)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "#E63946" }} />
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: "#0f172a" }}
                >
                  {t.pricing_trial_name}
                </h2>
              </div>

              <div className="mb-4">
                <span
                  className="text-4xl font-extrabold"
                  style={{ color: "#0f172a" }}
                >
                  {t.pricing_trial_price}
                </span>
                <span
                  className="text-sm ml-1"
                  style={{ color: "#64748b" }}
                >
                  / {t.pricing_trial_period}
                </span>
              </div>

              <p
                className="text-sm leading-relaxed mb-6 flex-1"
                style={{ color: "#475569",  }}
              >
                {t.pricing_trial_desc}
              </p>

              <button
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200"
                style={{
                  backgroundColor: showCheckout ? "#E63946" : "#C82F3B",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E63946")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = showCheckout ? "#E63946" : "#C82F3B")
                }
                onClick={handleSubscribe}
              >
                {t.pricing_cta_trial}
              </button>
            </div>

            {/* Monthly Plan */}
            <div
              className="rounded-2xl p-8 flex flex-col"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(13, 51, 17, 0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(13, 51, 17, 0.08)" }}
                >
                  <Crown className="w-4 h-4" style={{ color: "#C82F3B" }} />
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: "#0f172a" }}
                >
                  {t.pricing_monthly_name}
                </h2>
              </div>

              <div className="mb-4">
                <span
                  className="text-4xl font-extrabold"
                  style={{ color: "#0f172a" }}
                >
                  {withPrice(t.pricing_monthly_price)}
                </span>
                <span
                  className="text-sm ml-1"
                  style={{ color: "#64748b" }}
                >
                  / {t.pricing_monthly_period}
                </span>
              </div>

              <p
                className="text-sm mb-1"
                style={{ color: "#64748b" }}
              >
                {t.pricing_billed_monthly ?? "Billed monthly"}
              </p>
              <p
                className="text-sm leading-relaxed mb-6 flex-1"
                style={{ color: "#475569",  }}
              >
                {t.pricing_monthly_desc}
              </p>

              <button
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  backgroundColor: "transparent",
                  border: "2px solid #C82F3B",
                  color: "#C82F3B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#C82F3B";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#C82F3B";
                }}
                onClick={handleSubscribe}
              >
                {withPrice(t.pricing_cta_monthly)}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sipay paywall — replaces the old Stripe inline checkout */}
      <PaywallModal
        isOpen={showCheckout && isAuthenticated}
        onClose={() => setShowCheckout(false)}
        onPaymentSuccess={() => {
          setShowCheckout(false);
          toast.success("Subscription activated!");
        }}
      />


      {/* ── COMPARISON TABLE ─────────────────────────────── */}
      <section
        className="py-16"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="container max-w-4xl mx-auto">
          <h2
            className="text-2xl md:text-3xl font-bold mb-8"
            style={{ color: "#0f172a" }}
          >
            {t.pricing_compare_title ?? "Discover what each plan includes"}
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-3 px-6 py-4 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: "#334155",  }}
              >
                {t.pricing_features_col ?? "Main features"}
              </div>
              <div
                className="text-sm font-semibold text-center"
                style={{ color: "#E63946",  }}
              >
                {t.pricing_trial_name}
              </div>
              <div
                className="text-sm font-semibold text-center"
                style={{ color: "#0f172a",  }}
              >
                {t.pricing_monthly_name}
              </div>
            </div>

            {/* Table rows */}
            {features.map((feature, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-3 border-b last:border-0"
                style={{
                  borderColor: "#e2e8f0",
                  backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#ffffff",
                }}
              >
                <div
                  className="text-sm"
                  style={{ color: "#334155",  }}
                >
                  {feature.name}
                </div>
                <div className="flex justify-center">
                  {feature.trial ? (
                    <Check className="w-4 h-4" style={{ color: "#E63946" }} />
                  ) : (
                    <X className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.monthly ? (
                    <Check className="w-4 h-4" style={{ color: "#E63946" }} />
                  ) : (
                    <X className="w-4 h-4" style={{ color: "#cbd5e1" }} />
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
            style={{ color: "#0f172a" }}
          >
            {t.faq_title}
          </h2>

          <div className="space-y-3">
            {pricingFaqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${openFaq === i ? "rgba(10, 10, 11, 0.3)" : "#e2e8f0"}`,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className="font-semibold text-sm pr-4"
                    style={{ color: "#0f172a",  }}
                  >
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#E63946" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#64748b" }} />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-4 text-sm leading-relaxed"
                    style={{ color: "#475569",  }}
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

// PricingPaymentForm (Stripe Elements wrapper) was removed in the Sipay
// migration. The PaywallModal above handles the whole checkout now.

// StripeInlineCheckout removed in the Stripe → Sipay migration. The
// public Pricing page now routes any "Subscribe" action through the
// shared PaywallModal (FastPay + Apple Pay + Google Pay + card).

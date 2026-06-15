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

  const pricingFaqs = [
    {
      question: t.pricing_faq_q1 ?? "Can I try all features during the trial?",
      answer: t.pricing_faq_a1 ?? "During the 48-hour trial you have access to basic editing features. For unlimited access, you'll need the monthly plan.",
    },
    {
      question: t.pricing_faq_q2 ?? "What happens after the 48-hour trial?",
      answer: t.pricing_faq_a2 ?? "After the trial, your plan automatically renews to the monthly plan. You can cancel anytime before the trial ends.",
    },
    {
      question: t.pricing_faq_q3 ?? "Is there any commitment with the monthly subscription?",
      answer: t.pricing_faq_a3 ?? "No long-term commitment. Cancel your monthly subscription anytime and you'll retain access until the end of the billing period.",
    },
    {
      question: t.pricing_faq_q4 ?? "Can I cancel my subscription at any time?",
      answer: t.pricing_faq_a4 ?? "Yes, you can cancel anytime from your account settings. No cancellation penalties.",
    },
    {
      question: t.pricing_faq_q5 ?? "Can I request a refund for an unused subscription?",
      answer: t.pricing_faq_a5 ?? "We evaluate refund requests case by case. Contact our support team and we'll do our best to help.",
    },
    {
      question: t.faq_q7,
      answer: t.faq_a7,
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

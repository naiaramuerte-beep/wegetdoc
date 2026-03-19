/* =============================================================
   Billing page — pdfe.com style
   Trial 0,50€ / Monthly 49,95€ + features table + FAQ
   ============================================================= */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, X, ChevronDown, ChevronUp, Flame } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { getLoginUrl } from "@/const";

// ─── Features comparison data ────────────────────────────────
const features = [
  { label: "Convert unlimitedly",       trial: false, monthly: true },
  { label: "Edit unlimitedly",          trial: false, monthly: true },
  { label: "Organize in folders",       trial: false, monthly: true },
  { label: "Store PDFs for more than 24 hours", trial: false, monthly: true },
  { label: "Collaborate with your team",trial: false, monthly: true },
  { label: "Create notes",              trial: true,  monthly: true },
  { label: "Manage Pages",              trial: true,  monthly: true },
  { label: "Sign documents",            trial: true,  monthly: true },
  { label: "Edit images",               trial: true,  monthly: true },
  { label: "Edit objects and shapes",   trial: true,  monthly: true },
  { label: "Highlight texts",           trial: true,  monthly: true },
  { label: "Protect your documents",    trial: true,  monthly: true },
];

// ─── FAQ data ────────────────────────────────────────────────
const faqs = [
  {
    q: "Can I try all features during the trial period?",
    a: "During the 7-day trial for 0,50€ you can access basic features like signing, annotating, editing images and shapes, highlighting, and protecting documents. Advanced features like unlimited conversion, unlimited editing, folder organization, and team collaboration are available on the Monthly plan.",
  },
  {
    q: "What happens after the 7-day trial ends?",
    a: "After the 7-day trial period, your plan automatically renews to the Monthly plan at 49,95€/month. You will be charged on the same payment method used for the trial. You can cancel at any time before the trial ends to avoid being charged.",
  },
  {
    q: "Is there a commitment with the monthly subscription?",
    a: "No, there is no long-term commitment. The Monthly plan is billed monthly and you can cancel at any time from your account settings. Your access will continue until the end of the current billing period.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes, you can cancel your subscription at any time from your account dashboard under the Billing section. Once cancelled, you will retain access to all premium features until the end of your current billing period.",
  },
  {
    q: "Can I request a refund for an unused subscription?",
    a: "If you have not used the service after being charged, you may request a refund within 7 days of the charge. Please contact our support team at support@editpdf.online with your account details and we will process your request promptly.",
  },
];

// ─── Check/X icon ────────────────────────────────────────────
function FeatureIcon({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white">
      <Check size={13} strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-500">
      <X size={13} strokeWidth={3} />
    </span>
  );
}

// ─── FAQ item ────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-slate-800 hover:text-slate-900 transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0 ml-3" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 ml-3" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-slate-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function Billing() {
  const { isAuthenticated } = useAuth();
  const { data: subData } = trpc.subscription.status.useQuery();
  const isPremium = subData?.isPremium ?? false;
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "monthly">("trial");
  const [currency, setCurrency] = useState("EUR");

  const handleStartTrial = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl(window.location.pathname);
      return;
    }
    setSelectedPlan("trial");
    setShowPaywall(true);
  };

  const handleBuyMonthly = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl(window.location.pathname);
      return;
    }
    setSelectedPlan("monthly");
    setShowPaywall(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Choose the plan that best<br />suits you
          </h1>
          {/* Currency selector */}
          <div className="flex items-center justify-center mt-6 mb-10">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
            >
              <option value="EUR">Currency — EUR €</option>
              <option value="USD">Currency — USD $</option>
              <option value="GBP">Currency — GBP £</option>
            </select>
          </div>

          {/* Plans */}
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Trial plan */}
            <div className="relative border-2 border-slate-900 rounded-2xl p-6 text-left bg-white shadow-sm">
              <div className="absolute -top-3 left-5">
                <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  <Flame size={11} />Most popular
                </span>
              </div>
              <h2 className="font-bold text-slate-900 text-lg mt-2">Trial plan</h2>
              <p className="text-4xl font-bold text-slate-900 mt-2 mb-1">0,50 €</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                With the 7-day trial plan, you can enjoy the service with limitations before deciding to upgrade to the next plan to unlock all features. After that period, the plan automatically renews to the monthly plan; you can cancel at any time.
              </p>
              {isPremium ? (
                <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold text-center">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={handleStartTrial}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors"
                >
                  Start Test
                </button>
              )}
            </div>

            {/* Monthly plan */}
            <div className="border border-slate-200 rounded-2xl p-6 text-left bg-white shadow-sm">
              <h2 className="font-bold text-slate-900 text-lg mt-2">Monthly plan</h2>
              <p className="text-4xl font-bold text-slate-900 mt-2 mb-1">
                49,95 €<span className="text-lg font-normal text-slate-500">/month</span>
              </p>
              <p className="text-xs text-slate-500 mb-1">Billed monthly</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                It will automatically renew unless you cancel the subscription.
              </p>
              {isPremium ? (
                <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold text-center">
                  Active
                </div>
              ) : (
                <button
                  onClick={handleBuyMonthly}
                  className="w-full py-2.5 rounded-xl border border-slate-300 hover:border-slate-500 text-slate-900 text-sm font-bold transition-colors"
                >
                  Buy Now
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Features comparison table */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Find out what each plan includes</h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-5 font-semibold text-slate-700">Main functions</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-center">Trial plan</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-center">Monthly plan</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 text-slate-600">{f.label}</td>
                    <td className="py-3 px-5 text-center"><FeatureIcon value={f.trial} /></td>
                    <td className="py-3 px-5 text-center"><FeatureIcon value={f.monthly} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h2>
          <div className="mt-4">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Payment modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        action="descargar"
      />
    </div>
  );
}

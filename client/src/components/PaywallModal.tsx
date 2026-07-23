/*
 * PaywallModal — Sipay (FastPay + 3DS Redsys) payment with PDF preview.
 * Two-column layout: PDF preview (left) + payment form (right).
 * Stripe was retired from the public paywall.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { colors } from "@/lib/brand";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight, Eye, EyeOff, Lock, Shield, FileText, ChevronDown, PenLine, Layers, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getStoredGclid } from "@/lib/gclid";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricing } from "@/lib/usePricing";
import { getAuthStrings } from "@/lib/authModalStrings";
import { trackEvent } from "@/lib/track";
import { INTRO_CHARGE_EUR, INTRO_CHARGE_CURRENCY } from "@/lib/pricing";

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
  /**
   * Optional converter context. When set, the modal swaps a few copy strings to
   * speak about the converted file ("Your Word file for only 0,50€") instead
   * of the editor-default "your PDF". Only affects rendering — no flow change.
   */
  converter?: { label: string; price: string };
  /**
   * When set to "trial-limit", renders a minimal 1-click upgrade view
   * (user already has a trial sub + saved card; just needs to end trial now
   * to charge €19.99 immediately). Falls back to the full checkout if the
   * saved card is declined.
   */
  reason?: "trial-limit";
  /**
   * When the parent passes this prop and the user is NOT already
   * authenticated, the modal mounts and immediately triggers the Google
   * OAuth popup — skipping the visible auth-choice step. Used by the
   * editor's "Descargar con Google" dropdown so the user lands on the
   * payment step with one fewer screen of friction.
   */
  autoTriggerGoogle?: boolean;
  /**
   * The editor sets this true once it has already persisted the document
   * (its own autoSaveDocument ran). When true the modal skips its own
   * auto-save to avoid a duplicate row. When false/absent (e.g. an anonymous
   * user who registers by EMAIL inside the modal — the editor never got a
   * chance to save), the modal saves the doc so it lands in the dashboard.
   */
  editorAlreadySaved?: boolean;
}

type Step = "auth-choice" | "plans";

// ── Card brand icons (real flat-style brand SVGs) ───────────────────────
// Each chip uses the official brand color + the real glyph outlines (Visa's
// V-A-wordmark, Mastercard's interlocking circles, Amex's blue tile with the
// AMERICAN EXPRESS arc). Paths are simplified for inline use but visually
// match the official brand marks at 36×24. License-wise the marks are
// permitted for indicating accepted payment methods (purpose of this UI).
function CardBrands() {
  return (
    <div className="flex items-center gap-1.5">
      {/* Visa — official wordmark on blue */}
      <svg width="36" height="24" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
        <rect width="750" height="471" rx="40" fill="#0E4595" />
        <path
          fill="#fff"
          d="M278.2 334.2L311.6 138.5h53.2l-33.4 195.7h-53.2zM524.3 142.7c-10.5-4.2-27.1-8.7-47.8-8.7-52.8 0-90 27.9-90.2 67.9-.4 29.5 26.6 45.9 47 55.7 20.8 10.1 27.7 16.5 27.7 25.5-.1 13.7-16.6 20-31.9 20-21.4 0-32.7-3.1-50.2-10.7l-6.9-3.3-7.5 46.4c12.5 5.7 35.5 10.7 59.4 11 56.1 0 92.7-27.6 93.1-70.2.3-23.5-14.1-41.4-45-56.1-18.7-9.5-30.2-15.9-30.1-25.5 0-8.6 9.8-17.7 31-17.7 17.6-.3 30.4 3.7 40.3 7.9l4.8 2.4 7.4-44.6M661.6 138.5h-41.3c-12.8 0-22.4 3.7-28 17.4l-79.5 178.3h56.1l11.2-31h68.6c1.6 7.3 6.5 31 6.5 31h49.6L661.6 138.5zM583.7 261c4.4-11.7 21.3-57.7 21.3-57.7-.3.5 4.4-11.7 7.1-19.4l3.6 17.5 12.4 59.6h-44.4zM229.3 138.5l-52 133.3-5.6-28.4c-9.7-32.7-39.9-68.2-73.7-86l47.6 176.6h56.7l84.3-195.5h-57.3z"
        />
        <path fill="#F2AE14" d="M111.4 138.5H25l-.7 4.2c67.3 17.2 111.9 58.6 130.4 108.4l-18.9-94.8c-3.3-13.2-12.7-17.2-24.4-17.7z" />
      </svg>

      {/* Mastercard — two interlocking circles on white */}
      <svg width="36" height="24" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
        <rect width="750" height="471" rx="40" fill="#fff" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="313.4" cy="235.5" r="153" fill="#EB001B" />
        <circle cx="436.6" cy="235.5" r="153" fill="#F79E1B" />
        <path
          fill="#FF5F00"
          d="M375 117.7a153.1 153.1 0 010 235.6 153.1 153.1 0 010-235.6z"
        />
      </svg>

      {/* American Express — blue tile with white centered "AMEX" wordmark,
          matching the compact version Stripe/Adyen use in their payment-method
          selectors. The full "AMERICAN EXPRESS" arc is illegible at 36px so we
          use the shorter form people instantly recognize. */}
      <svg width="36" height="24" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" aria-label="American Express">
        <rect width="750" height="471" rx="40" fill="#1F72CD" />
        <text
          x="375"
          y="305"
          fontSize="220"
          fontFamily="Helvetica, Arial, sans-serif"
          fontWeight="900"
          fill="#fff"
          textAnchor="middle"
          letterSpacing="6"
        >
          AMEX
        </text>
      </svg>
    </div>
  );
}

// ── Sipay checkout ─────────────────────────────────────────────────────────────
// ─── Google Pay kill switch ──────────────────────────────────────────────────
// RE-ENABLED — Sipay confirmed on 2026-06-30 that Google Pay is now active on
// our existing SIPAY_KEY, so `gatewayMerchantId: sipayMerchantKey` is the
// correct value (no dedicated ID needed). This resolves the OR_BIBED_11
// ("este comercio no puede aceptar tu pago") that blocked real transactions
// on the 2026-06-29 go-live. The button renders again alongside Card + Apple
// Pay. Flip back to false if OR_BIBED_11 reappears in production.
const GPAY_ENABLED = true;

// FastPay JS captures the card in Sipay's iframe; we forward the resulting
// request_id to our backend to fire /mdwr/v1/all-in-one and then navigate the
// parent window to the 3DS URL Sipay returns.
// Strings of our own chrome inside the Sipay payment step. The FastPay iframe
// strings (card number, expiry, "Recordar datos", DESCARGAR, "Powered by sipay"…)
// are rendered by Sipay's bundle and only respect their data-lang attribute
// (es/en/ca only).
const SIPAY_STRINGS: Record<string, {
  loading: string;
  authorizing: string;
  authFailedTitle: string;
  authFailedBody: string;
  cancel: string;
  trust3ds: string;
  trustPci: string;
  payButton: string; // shown inside the FastPay iframe via data-paymentbutton
  cardOption: string; // collapsed row label "Credit / debit card"
}> = {
  es: {
    loading: "Cargando formulario de pago…",
    authorizing: "Autorizando y redirigiendo a 3DS…",
    authFailedTitle: "No pudimos autorizar el pago",
    authFailedBody: "Vuelve a intentarlo en unos minutos o contacta con soporte si el problema persiste.",
    cancel: "Cancelar",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Descargar",
    cardOption: "Tarjeta de crédito o débito",
  },
  en: {
    loading: "Loading payment form…",
    authorizing: "Authorizing and redirecting to 3DS…",
    authFailedTitle: "We couldn't authorize the payment",
    authFailedBody: "Please try again in a few minutes or contact support if the problem persists.",
    cancel: "Cancel",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Download",
    cardOption: "Credit or debit card",
  },
  fr: {
    loading: "Chargement du formulaire de paiement…",
    authorizing: "Autorisation et redirection vers 3DS…",
    authFailedTitle: "Nous n'avons pas pu autoriser le paiement",
    authFailedBody: "Veuillez réessayer dans quelques minutes ou contacter le support si le problème persiste.",
    cancel: "Annuler",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Télécharger",
    cardOption: "Carte de crédit ou de débit",
  },
  de: {
    loading: "Zahlungsformular wird geladen…",
    authorizing: "Autorisierung und Weiterleitung zu 3DS…",
    authFailedTitle: "Die Zahlung konnte nicht autorisiert werden",
    authFailedBody: "Bitte versuchen Sie es in einigen Minuten erneut oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.",
    cancel: "Abbrechen",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Herunterladen",
    cardOption: "Kredit- oder Debitkarte",
  },
  it: {
    loading: "Caricamento del modulo di pagamento…",
    authorizing: "Autorizzazione e reindirizzamento a 3DS…",
    authFailedTitle: "Non siamo riusciti ad autorizzare il pagamento",
    authFailedBody: "Riprova tra qualche minuto o contatta l'assistenza se il problema persiste.",
    cancel: "Annulla",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Scarica",
    cardOption: "Carta di credito o di debito",
  },
  pt: {
    loading: "Carregando formulário de pagamento…",
    authorizing: "Autorizando e redirecionando para 3DS…",
    authFailedTitle: "Não foi possível autorizar o pagamento",
    authFailedBody: "Tente novamente em alguns minutos ou contate o suporte se o problema persistir.",
    cancel: "Cancelar",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Baixar",
    cardOption: "Cartão de crédito ou débito",
  },
  nl: {
    loading: "Betaalformulier laden…",
    authorizing: "Autoriseren en doorverwijzen naar 3DS…",
    authFailedTitle: "We konden de betaling niet autoriseren",
    authFailedBody: "Probeer het over een paar minuten opnieuw of neem contact op met support als het probleem aanhoudt.",
    cancel: "Annuleren",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Downloaden",
    cardOption: "Krediet- of debetkaart",
  },
  pl: {
    loading: "Ładowanie formularza płatności…",
    authorizing: "Autoryzowanie i przekierowywanie do 3DS…",
    authFailedTitle: "Nie udało nam się autoryzować płatności",
    authFailedBody: "Spróbuj ponownie za kilka minut lub skontaktuj się z pomocą techniczną, jeśli problem nie ustępuje.",
    cancel: "Anuluj",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Pobierz",
    cardOption: "Karta kredytowa lub debetowa",
  },
  ru: {
    loading: "Загрузка формы оплаты…",
    authorizing: "Авторизация и перенаправление на 3DS…",
    authFailedTitle: "Не удалось авторизовать платёж",
    authFailedBody: "Попробуйте снова через несколько минут или обратитесь в поддержку, если проблема не исчезнет.",
    cancel: "Отмена",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Скачать",
    cardOption: "Кредитная или дебетовая карта",
  },
  zh: {
    loading: "正在加载支付表单…",
    authorizing: "正在授权并跳转到 3DS…",
    authFailedTitle: "无法授权付款",
    authFailedBody: "请几分钟后重试，如果问题持续，请联系客服。",
    cancel: "取消",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "下载",
    cardOption: "信用卡或借记卡",
  },
  uk: {
    loading: "Завантаження форми оплати…",
    authorizing: "Авторизація та перенаправлення на 3DS…",
    authFailedTitle: "Не вдалося авторизувати платіж",
    authFailedBody: "Спробуйте ще раз за кілька хвилин або зверніться до підтримки, якщо проблема не зникає.",
    cancel: "Скасувати",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Завантажити",
    cardOption: "Кредитна або дебетова картка",
  },
  ro: {
    loading: "Se încarcă formularul de plată…",
    authorizing: "Se autorizează și se redirecționează către 3DS…",
    authFailedTitle: "Nu am putut autoriza plata",
    authFailedBody: "Te rugăm să încerci din nou peste câteva minute sau să contactezi suportul dacă problema persistă.",
    cancel: "Anulează",
    trust3ds: "3DS Redsys",
    trustPci: "PCI Sipay",
    payButton: "Descarcă",
    cardOption: "Card de credit sau de debit",
  },
};

// FastPay only supports es / en / ca. Map any other code down to en.
function fastpayLang(lang: string): "es" | "en" | "ca" {
  if (lang === "es") return "es";
  if (lang === "ca") return "ca";
  return "en";
}

function SipayCheckoutForm({
  onSuccess: _onSuccess,
  onClose,
  pdfData,
  thumbnailUrl,
  buildPdfForUpload: _buildPdfForUpload,
  converter,
}: {
  onSuccess: (transactionId?: string) => void;
  onClose: () => void;
  pdfData?: PdfPayload;
  thumbnailUrl?: string;
  buildPdfForUpload?: () => Promise<{ base64: string; name: string; size: number } | null>;
  converter?: { label: string; price: string };
}) {
  const { t, lang } = useLanguage();
  const s = SIPAY_STRINGS[lang] ?? SIPAY_STRINGS.en;
  const fpLang = fastpayLang(lang);
  const sipayConfigQ = trpc.subscription.sipayConfig.useQuery();
  const initMut = trpc.subscription.sipayCheckoutInit.useMutation();
  const [scriptReady, setScriptReady] = useState(false);
  const [fastpayResult, setFastpayResult] = useState<{ payload?: { request_id?: string }; request_id?: string } | null>(null);
  // Bump to force a full FastPay re-init (fresh script + fresh iframe) so the
  // user can retry after a declined card — otherwise the consumed iframe never
  // comes back and the form is stuck on the "Preparando…" skeleton.
  const [retryNonce, setRetryNonce] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Collapsed by default. The user picks "Tarjeta de crédito o débito" to
  // expand the FastPay iframe. Auto-opening on mount triggers FastPay's
  // mobile new-tab fallback in some scenarios; making the user opt-in keeps
  // the iframe inline and matches the UX on mindmetric.io.
  // Card collapsed by default on every viewport — the user explicitly
  // prefers the closed state so the modal stays compact until they
  // commit to the card path.
  const [cardExpanded, setCardExpanded] = useState(false);
  // Tracks which fastpay request_ids we've already attempted so we don't
  // retry the same token (one-shot). Without this, the effect re-fired on
  // every setRedirecting(false) → infinite loop spamming Sipay.
  const triedFastpayIdRef = useRef<string | null>(null);

  // 1) Inject FastPay bundle on every mount. We force a fresh script + reset
  //    window.Fastpay because the bundle keeps internal "iframe already
  //    created" state across modal close/reopen and refuses to recreate the
  //    iframe on the second open, leaving the form empty.
  useEffect(() => {
    if (!sipayConfigQ.data?.bundleUrl) return;
    (window as any).DONT_AUTOLOAD_FPAY = true;

    document.querySelectorAll(`script[data-sipay-fastpay="1"]`).forEach((s) => s.remove());
    try { delete (window as any).Fastpay; } catch {}
    setScriptReady(false);

    const s = document.createElement("script");
    s.src = sipayConfigQ.data.bundleUrl;
    s.async = true;
    s.dataset.sipayFastpay = "1";
    s.onload = () => setScriptReady(true);
    s.onerror = () => toast.error("No se pudo cargar el formulario de pago. Recarga la página.");
    document.head.appendChild(s);

    return () => {
      document.querySelectorAll(`script[data-sipay-fastpay="1"]`).forEach((sc) => sc.remove());
      try { delete (window as any).Fastpay; } catch {}
    };
  }, [sipayConfigQ.data?.bundleUrl, retryNonce]);

  // 2) Expose a global callback for FastPay to invoke when the card is captured.
  useEffect(() => {
    (window as any).__editorpdfFastpayResult = (resp: any) => {
      console.log("[Sipay] FastPay result:", resp);
      // Honest name: this isn't the "Pagar" button click (that lives
      // inside Sipay's cross-origin iframe and we can't reach it) — it's
      // the moment Sipay tells us the user finished the form and
      // submitted a valid card. The gap between paywall_shown and
      // card_tokenized = users who opened the card form and abandoned
      // without filling it.
      trackEvent("card_tokenized", { method: "card" });
      setFastpayResult(resp);
    };
    return () => { delete (window as any).__editorpdfFastpayResult; };
  }, []);

  // 3) Once the bundle is loaded AND our button is in the DOM, call loadAll
  //    so FastPay decorates it, then auto-click the hidden button. Single
  //    600ms timeout (matches the integration on mindmetric.io which is
  //    another merchant on the same Sipay account — multiple rapid clicks
  //    appear to trigger FastPay's mobile new-tab fallback).
  useEffect(() => {
    if (!scriptReady || !sipayConfigQ.data?.key || !cardExpanded) return;
    const fp = (window as any).Fastpay;
    if (!fp) return;

    // Remove any leftover card iframe from a previous attempt BEFORE decorating
    // again — otherwise a retry stacks a SECOND card form on top of the first
    // (FastPay injects the iframe as a sibling of .fastpay-btn inside the shell,
    // and its src doesn't always match the sipay/fastpay selectors we swept).
    document.querySelectorAll(".fastpay-shell iframe").forEach((el) => el.remove());

    try {
      if (typeof fp.customize === "function") {
        // Sipay's customize() just JSON.stringifies whatever we pass and
        // sends it to their server-side renderer. The brand colours work;
        // the spacing keys below are best-effort attempts (their docs
        // don't list spacing options). If their renderer ignores them
        // the iframe height bump in the CSS below buys some breathing
        // room either way.
        fp.customize({
          color: "#E63946",
          primaryColor: "#E63946",
          buttonColor: "#E63946",
          accentColor: "#E63946",
          theme: "red",
          padding: 20,
          spacing: 16,
          gap: 16,
          buttonMarginTop: 16,
          marginTop: 16,
        });
      }
    } catch (err) { console.error("[Sipay] customize failed:", err); }

    try { if (typeof fp.loadAll === "function") fp.loadAll(); } catch {}

    const timer = setTimeout(() => {
      const btn = document.querySelector(".fastpay-btn") as HTMLButtonElement | null;
      const iframe = document.querySelector(".fastpay-btn + iframe");
      if (btn && !iframe) {
        try { btn.click(); } catch (err) { console.error("[Sipay] auto-click failed:", err); }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      // FastPay injects its iframe as a sibling of .fastpay-btn (via the
      // bundle's loadAll → click path), so React's unmount of the button
      // doesn't carry it away. When the user collapses the row, the iframe
      // would otherwise stick around floating in the DOM and show a
      // half-rendered card form. Sweep any leftover iframes + popup hosts.
      document.querySelectorAll(".fastpay-shell iframe").forEach((el) => el.remove());
      document.querySelectorAll("iframe[src*='sipay']").forEach((el) => el.remove());
      document.querySelectorAll("iframe[src*='fastpay']").forEach((el) => el.remove());
      document.querySelectorAll("[id^='fastpay']").forEach((el) => el.remove());
      document.querySelectorAll(".fastpay-modal, .fastpay-overlay, .fastpay-wrapper").forEach((el) => el.remove());
    };
  }, [scriptReady, sipayConfigQ.data?.key, cardExpanded, retryNonce]);

  // 4) When FastPay returns a token, auto-fire the all-in-one authorization
  //    and navigate to the 3DS URL Sipay gives us back. We track the last
  //    attempted token in a ref so re-renders don't fire duplicate requests.
  useEffect(() => {
    const fpId = fastpayResult?.payload?.request_id ?? fastpayResult?.request_id;
    if (!fpId) return;
    if (triedFastpayIdRef.current === fpId) return;
    triedFastpayIdRef.current = fpId;
    setRedirecting(true);
    setAuthError(null);
    const cardGc = getStoredGclid();
    initMut
      .mutateAsync({ fastpayRequestId: fpId, amountCents: 50, gclid: cardGc?.id, gclidType: cardGc?.type, lang })
      .then((res) => {
        if (res.redirectUrl) {
          // User is about to leave our domain for the bank's 3DS page
          // (Redsys via Sipay). Last reliable signal we can fire from
          // the client before the redirect.
          trackEvent("3ds_started", { method: "card" });
          window.location.href = res.redirectUrl;
        } else {
          trackEvent("payment_failed", { method: "card", decline_reason: "no_3ds_url" });
          setAuthError(s.authFailedBody); // localized; raw reason kept in the event
          setRedirecting(false);
        }
      })
      .catch((err) => {
        trackEvent("payment_failed", {
          method: "card",
          decline_reason: String(err?.message ?? "init_failed").slice(0, 200),
        });
        setAuthError(s.authFailedBody); // localized user message; raw error only in analytics
        setRedirecting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastpayResult]);

  return (
    <div className="flex flex-col md:flex-row min-h-0">
      {/* ── PDF preview column — pdfe-style with Trustpilot widget +
              "PDFs procesados hoy" counter underneath the thumbnail. The
              left column is now a trust-signal stack: doc preview proves
              the user already has work-in-progress, then the Trustpilot
              widget + counter prove the service is trusted by many. ── */}
      <div className="flex items-center gap-3 bg-[#f4f5f7] p-3 md:hidden">
        <div className="w-14 h-20 rounded border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <span className="text-red-400 text-[8px] font-bold">PDF</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#1E9E63] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
            <p className="text-xs font-semibold text-slate-800">{t.paywall_doc_ready}</p>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{pdfData?.name ?? "document.pdf"}</p>
        </div>
      </div>
      <div className="hidden md:flex flex-col bg-[#f4f5f7] p-6" style={{ minWidth: 300, maxWidth: 320 }}>
        <div className="flex items-center gap-2 mb-4 w-full">
          <div className="w-6 h-6 rounded-full bg-[#1E9E63] flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-white" /></div>
          <p className="text-sm font-semibold text-slate-800">{t.paywall_doc_ready}</p>
        </div>
        <div className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center mb-3" style={{ aspectRatio: "0.707", maxHeight: 220 }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Document preview" className="w-full h-full object-contain" />
          ) : (
            <div className="flex items-center justify-center w-full h-full"><span className="text-red-400 text-xs font-bold">PDF</span></div>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center truncate w-full font-medium mb-5">{pdfData?.name ?? "document.pdf"}</p>

        {/* Trustpilot static widget — green stars + reviews count. We
            mirror the visual of the real Trustpilot embed but render it
            locally so the modal stays fast and works offline of their CDN. */}
        <div className="flex items-center gap-2 mb-3 pt-4 border-t" style={{ borderColor: "#e2e8f0" }}>
          <span className="text-sm font-bold text-slate-700">{t.paywall_trustpilot_excellent}</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="w-4 h-4 flex items-center justify-center" style={{ backgroundColor: "#00B67A" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-700">4.6</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          <strong className="text-slate-700">8.247</strong> {t.paywall_trustpilot_reviews_label}{" "}
          <span className="font-semibold" style={{ color: "#00B67A" }}>★ Trustpilot</span>
        </p>

        {/* PDFs processed today — animated counter, mirrors Home stats. */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "#e2e8f0" }}>
          <p className="text-[11px] text-slate-500">{t.paywall_pdfs_today}</p>
          <p className="text-sm font-bold text-slate-800 tabular-nums">{(70244).toLocaleString(lang === "en" ? "en-US" : "es-ES")}</p>
        </div>
      </div>

      {/* ── Payment column — pdfe-style: clean heading, total summary,
              wallet buttons, card form, pay button, slim legal text. ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex-1 px-3 py-4 md:px-6 md:py-5 space-y-4 md:space-y-5">
          {/* Heading + total row — replaces the previous blue gradient
              card and yellow recurring warning. The price disclosure
              stays only in the legal microcopy below the pay button so
              the visual hierarchy reads clean (matches pdfe.com). */}
          <div>
            <h3 className="text-[22px] md:text-[26px] font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
              {converter
                ? t.paywall_download_instant.replace("PDF", converter.label)
                : t.paywall_download_instant}
            </h3>

            {/* Order summary — the item + what's included. Builds desire and
                justifies the price without mentioning the recurring plan (that
                stays only in the legal microcopy under the pay button). */}
            <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "#e5e7eb" }}>
              <div className="px-4 py-2.5" style={{ background: "#f8fafc", borderBottom: "1px solid #eef2f7" }}>
                <p className="text-[11px] font-bold tracking-wide uppercase text-slate-500">{t.paywall_order_summary}</p>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "#FEE7EA" }}>
                    <FileText className="w-4 h-4" style={{ color: "#E63946" }} />
                  </span>
                  <span className="text-sm font-semibold text-slate-900 truncate">{converter ? converter.label : t.paywall_your_doc}</span>
                </span>
                <span className="text-sm font-extrabold text-slate-900 flex-shrink-0">{converter ? converter.price : "0,50 €"}</span>
              </div>
              {[
                { icon: PenLine, label: t.paywall_feat_edit },
                { icon: Layers, label: t.paywall_feat_organize },
                { icon: ShieldCheck, label: t.paywall_feat_secure },
              ].map(({ icon: FIcon, label }, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2 text-[13px]" style={i < 2 ? { borderBottom: "1px solid #f1f5f9" } : undefined}>
                  <span className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <FIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                    <span className="truncate font-medium">{label}</span>
                  </span>
                  <span className="flex items-center gap-1 font-bold flex-shrink-0" style={{ color: "#16a34a" }}>
                    <Check className="w-3.5 h-3.5" />{t.paywall_incl}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between pt-3 border-t" style={{ borderColor: "#e5e7eb" }}>
              <p className="text-sm font-semibold text-slate-700">{t.paywall_total_today}</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {converter ? converter.price : "0,50 €"}
              </p>
            </div>
          </div>

          {/* FastPay button + loading + redirect overlay */}
          {!sipayConfigQ.data?.key && (
            <p className="text-sm text-gray-500 text-center">Cargando configuración…</p>
          )}
          {sipayConfigQ.data?.key && (
            <div className="flex flex-col items-stretch gap-3">
              <p className="text-[11px] font-bold tracking-wide uppercase text-slate-500 -mb-0.5">{t.paywall_choose_method}</p>
              {/* Apple Pay button — only shown on Safari iOS/macOS where the
                  PassKit JS API exists AND the buyer has at least one Apple
                  Pay-enabled card linked to the device. */}
              <ApplePayButton
                amountCents={50}
                onSuccess={(txn) => {
                  window.location.href = `/payment/success?txn=${encodeURIComponent(txn)}&provider=sipay-apay`;
                }}
              />

              {/* Google Pay button — active. `GPAY_ENABLED` is the kill switch
                  (flip to false to hide instantly if OR_BIBED_11 returns). Uses
                  the SIPAY_KEY as gatewayMerchantId per Sipay's 2026-06-30
                  confirmation. */}
              {GPAY_ENABLED && (
                <GooglePayButton
                  sipayMerchantKey={sipayConfigQ.data.key}
                  amountCents={50}
                  onSuccess={(txn) => {
                    window.location.href = `/payment/success?txn=${encodeURIComponent(txn)}&provider=sipay-gpay`;
                  }}
                />
              )}

              {/* Card / debit collapsible row — clicking it expands the FastPay
                  iframe inline. Keeping it collapsed by default avoids the mobile
                  new-tab fallback and matches the UX on mindmetric.io. */}
              <button
                type="button"
                onClick={() => setCardExpanded((v) => !v)}
                className="flex items-center justify-between gap-2 w-full px-4 rounded-xl text-white transition-all hover:brightness-95"
                style={{ height: 52, background: "#1E66C9", boxShadow: "0 6px 16px -8px rgba(30,102,201,0.6)" }}
              >
                <span className="flex items-center gap-2.5 text-[15px] font-semibold min-w-0 flex-1">
                  <CreditCard className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate text-left">{s.cardOption}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {/* Card brand logos — hidden on small screens to keep the row
                      from wrapping when the localized label is long. */}
                  <span className="hidden sm:block">
                    <CardBrands />
                  </span>
                  <ChevronDown
                    className="w-4 h-4 opacity-90 transition-transform"
                    style={{ transform: cardExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </span>
              </button>

              {cardExpanded && !scriptReady && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E63946]" />
                  {s.loading}
                </div>
              )}
              {cardExpanded && (
              <div className="fastpay-shell relative">
                {/* Skeleton shown while Sipay is decorating the .fastpay-btn
                    and creating the iframe (~600 ms). Without this the user
                    sees blank space and some bounce thinking it broke. CSS
                    `:has(iframe)` hides the skeleton the instant the real
                    iframe appears (Chrome 105+ / Safari 15.4+ / FF 121+).
                    Older browsers see both stacked — not pretty but works. */}
                <div className="fastpay-skel rounded-lg overflow-hidden" style={{ background: "#f7f8f9", border: "1px solid #e5e7eb" }}>
                  <div className="p-4 space-y-3 animate-pulse">
                    <div className="h-3 w-24 rounded bg-gray-200" />
                    <div className="h-10 rounded bg-gray-200" />
                    <div className="flex gap-3">
                      <div className="h-10 flex-1 rounded bg-gray-200" />
                      <div className="h-10 flex-1 rounded bg-gray-200" />
                    </div>
                    <div className="h-12 rounded bg-gray-300" />
                    <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Preparando formulario seguro…
                    </div>
                  </div>
                </div>
              <button
                type="button"
                data-key={sipayConfigQ.data.key}
                data-amount="50"
                data-currency="EUR"
                data-template="v4"
                data-callback="__editorpdfFastpayResult"
                data-lang={fpLang}
                data-paymentbutton={s.payButton}
                data-hiddenprice="true"
                data-color="#E63946"
                data-buttoncolor="#E63946"
                data-primary="#E63946"
                /* Light-gray bg to match the rest of our modal. None of these
                   keys are documented but cost nothing if Sipay ignores them. */
                data-bg="#f7f8f9"
                data-bgcolor="#f7f8f9"
                data-background="#f7f8f9"
                data-backgroundcolor="#f7f8f9"
                /* Keep the iframe inline on mobile (default FastPay opens a
                   new tab on small screens). Confirmed working on mindmetric.io
                   which uses the same Sipay merchant. */
                data-notab="true"
                /* Hide cardholder name field — not needed for our flow. */
                data-cardholdername="false"
                /* "Recordar datos" toggle — Sipay's FastPay bundle only
                   reads 23 specific data-attributes (verified by grepping
                   fastpay.js: the read list includes "autosave", "remember"
                   and "remembertext", everything else we tried before was
                   ignored). The JS does `t[e] && (i[e] = t[e])`, so an
                   empty string is falsy → not sent → server falls back to
                   "show toggle" default. We now send explicit string
                   values so Sipay's server-side renderer gets the override.
                   If this still shows the toggle, Sipay support has to
                   disable it on the backoffice for our resource. */
                data-remember="false"
                data-autosave="false"
                data-tokenization="false"
                className="fastpay-btn"
                aria-hidden="true"
                tabIndex={-1}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  border: 0,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                Descargar
              </button>
              <style>{`
                /* iframe fills the modal width — Sipay's internal grey panel
                   stays gray (we can't reach inside their iframe to override
                   it), but the area AROUND the iframe matches our requested
                   light-gray so the seam is invisible. Responsive heights:
                   480px is the smallest that fits the FastPay form (number +
                   MM/YY + CVV + Recordar toggle + DESCARGAR + Powered/3DS
                   footer). Tablet bumps to 540, desktop to 580 so it never
                   needs nested scrolling on the common viewport sizes. */
                .fastpay-btn + iframe {
                  display: block !important;
                  width: 100% !important;
                  min-height: 520px !important;
                  border: 0 !important;
                  background: #f7f8f9 !important;
                  position: relative !important;
                  top: 0 !important;
                  left: 0 !important;
                  overflow: hidden !important;
                  /* Slight padding-top so the iframe lifts off the
                     fields above it visually. This is OUR side of the
                     iframe — outside Sipay's content — so it adds
                     breathing room without touching their layout. */
                  margin-top: 6px !important;
                }
                @media (min-height: 700px) {
                  .fastpay-btn + iframe { min-height: 580px !important; }
                }
                @media (min-width: 768px) {
                  .fastpay-btn + iframe { min-height: 620px !important; }
                }
                /* Hide the skeleton the instant the real iframe shows up. */
                .fastpay-shell:has(iframe) .fastpay-skel {
                  display: none !important;
                }
              `}</style>
              </div>
              )}
              {/* Hint under Sipay's iframe: if the card number/date/CVV is
                  invalid, Sipay marks the field red and silently blocks its
                  "Descargar" button (nothing happens on click). We can't reach
                  inside their cross-origin iframe to add a message, so this
                  helper — in OUR chrome, right below it — tells the user what to
                  check so a mistyped digit doesn't read as a broken form. */}
              {cardExpanded && !redirecting && !authError && (
                <p className="text-[11px] text-gray-400 text-center mt-1 px-3 leading-snug">
                  {fpLang === "es"
                    ? "Si el botón no responde, revisa que el número de tarjeta, la fecha (MM/AA) y el CVV sean correctos."
                    : fpLang === "ca"
                    ? "Si el botó no respon, comprova que el número de targeta, la data (MM/AA) i el CVV siguin correctes."
                    : "If the button doesn't respond, check that the card number, date (MM/YY) and CVV are correct."}
                </p>
              )}
              {redirecting && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E63946]" />
                  {s.authorizing}
                </div>
              )}
              {authError && !redirecting && (
                <div className="rounded-lg p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200">
                  <p className="font-semibold mb-1">{s.authFailedTitle}</p>
                  <p className="mb-2">{s.authFailedBody}</p>
                  {/* Retry: reset the FastPay state and force a fresh script +
                      iframe so the user can enter their card again. Without this
                      the consumed iframe never returns and the form is stuck. */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setRedirecting(false);
                      setFastpayResult(null);
                      triedFastpayIdRef.current = null;
                      // Fully TEAR DOWN the card form before rebuilding it —
                      // just re-decorating on top of the consumed iframe stacked
                      // a SECOND form. Collapse (unmounts the shell + iframe),
                      // then on the next tick reinject a fresh script + re-expand
                      // so exactly one clean form comes back.
                      setCardExpanded(false);
                      setTimeout(() => {
                        setRetryNonce((n) => n + 1);
                        setCardExpanded(true);
                      }, 150);
                    }}
                    className="w-full rounded-lg py-2 text-white text-xs font-semibold"
                    style={{ backgroundColor: "#E63946" }}
                  >
                    {fpLang === "es" ? "Reintentar el pago" : fpLang === "ca" ? "Torna-ho a provar" : "Try again"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Compact trust badges — kept slim, no border */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> {s.trust3ds}</span>
            <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> {s.trustPci}</span>
          </div>

          {/* Mobile-only: compact Trustpilot strip at the bottom of the
              modal. On desktop the widget lives in the left column. */}
          <div className="md:hidden flex items-center justify-center gap-2 pt-3 border-t" style={{ borderColor: "#e5e7eb" }}>
            <span className="text-xs font-bold text-slate-700">{t.paywall_trustpilot_excellent}</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="w-3 h-3 flex items-center justify-center" style={{ backgroundColor: "#00B67A" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-slate-500"><strong className="text-slate-700">8.247</strong> {t.paywall_trustpilot_reviews_label} · <span style={{ color: "#00B67A" }} className="font-semibold">★ Trustpilot</span></span>
          </div>
        </div>

        {/* Green success-strip footer (pdfe.com pattern). Stays anchored
            at the bottom of the payment column reinforcing the reason
            the user is here: their PDF is one click away. `mt-auto` is
            the belt to the `flex-1` suspenders on the content div above
            — if the left column (Trustpilot widget + counter) is taller
            than the payment form, the right column gets stretched and
            this anchors the strip flush against the modal floor instead
            of leaving an empty white band below it. */}
        <div className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-medium" style={{ backgroundColor: "#E8F7EF", color: "#1E9E63", borderTop: "1px solid #C7EAD5" }}>
          <Check className="w-3.5 h-3.5" />
          <span>{t.paywall_bottom_strip}</span>
        </div>
      </div>
    </div>
  );
}

// ── Apple Pay button ──────────────────────────────────────────────────────────
// Apple Pay JS API is exclusive to Safari (iOS + macOS) and iOS WebKit-based
// browsers. On any other browser window.ApplePaySession is undefined; we
// render nothing.
//
// Flow:
//  1. Mount: check `ApplePaySession.canMakePayments()` (cheap, sync).
//  2. Click: spin up `new ApplePaySession(version=3, request)`.
//  3. `onvalidatemerchant`: POST the validationURL Apple gives us to our
//     `/api/sipay/applepay/validate-merchant` proxy; hand the result back
//     via `session.completeMerchantValidation()`.
//  4. `onpaymentauthorized`: send the token to our tRPC mutation, which
//     forwards to Sipay /mdwr/v1/authorization with catcher.type="apay".
//  5. On Sipay OK: `session.completePayment(STATUS_SUCCESS)` then redirect
//     to /payment/success.
function ApplePayButton({
  amountCents,
  onSuccess,
}: {
  amountCents: number;
  onSuccess: (transactionId: string) => void;
}) {
  const { lang } = useLanguage();
  const s = SIPAY_STRINGS[lang] ?? SIPAY_STRINGS.en;
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chargeMut = trpc.subscription.sipayApplePayCharge.useMutation();

  useEffect(() => {
    try {
      const AP = (window as any).ApplePaySession;
      if (!AP) {
        console.log("[ApplePay] ApplePaySession not available (non-Safari browser)");
        return;
      }
      if (typeof AP.canMakePayments !== "function" || !AP.canMakePayments()) {
        console.log("[ApplePay] canMakePayments() returned false");
        return;
      }
      console.log("[ApplePay] available — rendering button");
      setReady(true);
    } catch (err: any) {
      console.warn("[ApplePay] availability check failed:", err?.message ?? err);
    }
  }, []);

  if (!ready) return null;

  const handleClick = () => {
    // User pressed the Apple Pay button — real click on our DOM, no
    // proxy needed (unlike card, where the click lives in Sipay's iframe).
    trackEvent("pay_clicked", { method: "applepay" });
    setError(null);
    setSubmitting(true);
    // Captured in onvalidatemerchant, used in onpaymentauthorized.
    // Sipay needs the same request_id in both steps so it can correlate
    // the validated Apple session to the charge — otherwise it returns
    // `no_card_data`.
    let sipayRequestId = "";
    try {
      const AP = (window as any).ApplePaySession;
      const request = {
        countryCode: "ES",
        currencyCode: "EUR",
        supportedNetworks: ["visa", "masterCard", "amex", "maestro"],
        merchantCapabilities: ["supports3DS"],
        total: {
          label: "EditorPDF",
          amount: (amountCents / 100).toFixed(2),
          type: "final",
        },
      };
      const session = new AP(3, request);

      session.onvalidatemerchant = async (event: any) => {
        try {
          console.log("[ApplePay] validating merchant…");
          const resp = await fetch("/api/sipay/applepay/validate-merchant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              validationURL: event.validationURL,
              domain: window.location.host,
            }),
          });
          if (!resp.ok) throw new Error(`validate-merchant ${resp.status}`);
          const { merchantSession, requestId } = await resp.json();
          sipayRequestId = requestId || "";
          console.log(`[ApplePay] merchant validated, requestId=${sipayRequestId || "(missing)"}`);
          session.completeMerchantValidation(merchantSession);
        } catch (err: any) {
          console.warn("[ApplePay] validate-merchant failed:", err?.message ?? err);
          setError(s.authFailedBody);
          // abort() throws InvalidAccessError if the session already ended
          // (validation failed / sheet dismissed) — guard it so it doesn't
          // become an unhandled promise rejection.
          try { session.abort(); } catch {}
          setSubmitting(false);
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          const tokenApay = event.payment?.token;
          if (!tokenApay) throw new Error("Apple Pay no devolvió token");
          if (!sipayRequestId) throw new Error("Sipay no devolvió request_id en validación de merchant");
          console.log("[ApplePay] payment authorized — charging via Sipay…");
          // Apple Pay's SCA (Face/Touch ID) just succeeded in the native
          // sheet — that's the moral equivalent of "3DS done" for the
          // card path. Fire here so the funnel has a consistent step.
          trackEvent("3ds_started", { method: "applepay" });
          const apayGc = getStoredGclid();
          const res = await chargeMut.mutateAsync({
            tokenApay: {
              paymentData: tokenApay.paymentData,
              paymentMethod: tokenApay.paymentMethod,
              transactionIdentifier: tokenApay.transactionIdentifier,
            },
            requestId: sipayRequestId,
            amountCents,
            gclid: apayGc?.id,
            gclidType: apayGc?.type,
            lang,
          });
          // Sandbox occasionally returns an empty transaction_id; fall back
          // to our own order so /payment/success always has a unique key.
          const txnId = res.transactionId || res.order || `apay-${Date.now()}`;
          session.completePayment(AP.STATUS_SUCCESS);
          onSuccess(txnId);
        } catch (err: any) {
          console.warn("[ApplePay] charge failed:", err?.message ?? err);
          trackEvent("payment_failed", {
            method: "applepay",
            decline_reason: String(err?.message ?? "charge_failed").slice(0, 200),
          });
          try { session.completePayment(AP.STATUS_FAILURE); } catch {}
          setError(s.authFailedBody);
          setSubmitting(false);
        }
      };

      session.oncancel = () => {
        console.log("[ApplePay] session canceled by buyer");
        // Buyer dismissed the Apple Pay sheet on purpose. Track this
        // separately from payment_failed so the funnel can distinguish
        // "got cold feet" from "card declined".
        trackEvent("pay_canceled", { method: "applepay" });
        setSubmitting(false);
      };

      session.begin();
    } catch (err: any) {
      console.warn("[ApplePay] failed to start session:", err?.message ?? err);
      setError(s.authFailedBody);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Apple's standardized Apple Pay button. The vendor-prefixed CSS
          properties (-apple-pay-button-type / -apple-pay-button-style) can't
          be set via React's inline style API, so they live in a <style> tag
          here. Safari is the only browser that actually paints this button;
          on any other engine the appearance value silently does nothing. */}
      <style>{`
        .editorpdf-apple-pay-btn {
          -webkit-appearance: -apple-pay-button;
          -apple-pay-button-type: plain;
          -apple-pay-button-style: black;
          height: 52px;
          width: 100%;
          border: 0;
          border-radius: 12px;
        }
        .editorpdf-apple-pay-btn[disabled] {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        aria-label="Pagar con Apple Pay"
        className="editorpdf-apple-pay-btn"
      />
      {submitting && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin text-[#E63946]" />
          Procesando…
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Google Pay button ──────────────────────────────────────────────────────────
// Renders Google's standardized Pay button when the device + browser supports
// Google Pay (Chrome Android, Chrome desktop with a saved card, etc.). On
// click we open Google's payment sheet, get a tokenized PaymentData, and
// forward it to our backend → Sipay /mdwr/v1/authorization. Sandbox = TEST
// environment in google.pay; production switches to PRODUCTION + the numeric
// merchantId once Google approves us at pay.google.com/business/console.
function GooglePayButton({
  sipayMerchantKey,
  amountCents,
  onSuccess,
}: {
  sipayMerchantKey: string;
  amountCents: number;
  onSuccess: (transactionId: string) => void;
}) {
  const { lang } = useLanguage();
  const s = SIPAY_STRINGS[lang] ?? SIPAY_STRINGS.en;
  const [scriptReady, setScriptReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chargeMut = trpc.subscription.sipayGpayCharge.useMutation();

  // 1) Load Google's pay.js once.
  useEffect(() => {
    console.log("[GPay] mount — loading pay.js…");
    if ((window as any).google?.payments?.api?.PaymentsClient) {
      console.log("[GPay] pay.js already in window — skipping load");
      setScriptReady(true);
      return;
    }
    // Poll for the global instead of relying on the existing-tag's `load`
    // event (which doesn't refire on remount). Resolves a real bug: if the
    // user closes and reopens the modal, the second mount would never set
    // scriptReady=true because the script tag was already in the DOM and
    // its load event had already fired.
    const existing = document.querySelector(`script[data-gpay="1"]`);
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://pay.google.com/gp/p/js/pay.js";
      s.async = true;
      s.dataset.gpay = "1";
      s.onload = () => console.log("[GPay] pay.js script load event fired");
      s.onerror = () => console.warn("[GPay] script failed to load (CSP/adblock/network)");
      document.head.appendChild(s);
    } else {
      console.log("[GPay] pay.js script tag already in DOM, polling for window.google…");
    }
    // Poll until the global appears or we give up after 8s.
    const start = Date.now();
    const iv = window.setInterval(() => {
      if ((window as any).google?.payments?.api?.PaymentsClient) {
        console.log("[GPay] window.google.payments.api.PaymentsClient available");
        setScriptReady(true);
        window.clearInterval(iv);
      } else if (Date.now() - start > 8000) {
        console.warn("[GPay] timed out waiting for pay.js (probably blocked)");
        window.clearInterval(iv);
      }
    }, 200);
    return () => window.clearInterval(iv);
  }, []);

  // 2) Once pay.js is loaded, check whether the user is ready to pay with
  //    Google Pay; if yes, render the official button via gpay.createButton.
  useEffect(() => {
    if (!scriptReady || !hostRef.current) return;
    const g = (window as any).google;
    if (!g?.payments?.api?.PaymentsClient) return;
    // Google-issued merchantId for "Clicklabs Digital Venture S.L." (the
    // legal entity that owns editorpdf.net) — pasted after the Web Integration
    // submission. With this set, the button switches to PRODUCTION on the
    // live domain (real cards, real money via Sipay). On other hosts (preview
    // deploys, localhost) we stay in TEST so we don't accidentally charge.
    const GOOGLE_PAY_MERCHANT_ID = "BCR2DN4T2627BZYZ";
    // Match both the apex and www host so the button doesn't fall back to TEST
    // when a visitor lands on www.editorpdf.net (Cloudflare adds www in some
    // SERPs / shared links). Railway preview hosts (*.up.railway.app) and
    // localhost still resolve to TEST so we never accidentally charge there.
    const host = window.location.hostname;
    const isProd =
      (host === "editorpdf.net" || host === "www.editorpdf.net") && !!GOOGLE_PAY_MERCHANT_ID;
    const client = new g.payments.api.PaymentsClient({
      environment: isProd ? "PRODUCTION" : "TEST",
    });
    const baseRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
    };
    const cardPaymentMethod = {
      type: "CARD",
      parameters: {
        allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
        allowedCardNetworks: ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"],
      },
      tokenizationSpecification: {
        type: "PAYMENT_GATEWAY",
        parameters: {
          gateway: "sipay",
          gatewayMerchantId: sipayMerchantKey,
        },
      },
    };
    console.log("[GPay] checking isReadyToPay…", { environment: isProd ? "PRODUCTION" : "TEST", gateway: "sipay", gatewayMerchantId: sipayMerchantKey });
    client
      .isReadyToPay({
        ...baseRequest,
        allowedPaymentMethods: [cardPaymentMethod],
      })
      .then((res: { result: boolean; paymentMethodPresent?: boolean }) => {
        console.log("[GPay] isReadyToPay response:", res);
        if (!res.result) {
          console.warn("[GPay] not ready — buyer needs a card linked to Google Pay or browser/device unsupported");
          return;
        }
        setReady(true);
        const host = hostRef.current;
        if (!host) return;
        // Clear previous button if remounting
        host.innerHTML = "";
        const button = client.createButton({
          // Google's Web Integration review flagged the button colour as a
          // brand-compliance issue when set to "white". Keep it on "black"
          // (the recommended default) so Google approves the integration.
          buttonColor: "black",
          buttonType: "pay",
          buttonRadius: 12,
          buttonSizeMode: "fill",
          onClick: async () => {
            // User pressed Google's standardized GPay button — real
            // click on our DOM (the button is OURS even though Google
            // creates it; it's not inside a cross-origin iframe).
            trackEvent("pay_clicked", { method: "googlepay" });
            setError(null);
            setSubmitting(true);
            try {
              const paymentData = await client.loadPaymentData({
                ...baseRequest,
                allowedPaymentMethods: [cardPaymentMethod],
                transactionInfo: {
                  totalPriceStatus: "FINAL",
                  totalPriceLabel: "Total",
                  totalPrice: (amountCents / 100).toFixed(2),
                  currencyCode: "EUR",
                  countryCode: "ES",
                },
                merchantInfo: {
                  merchantName: "EditorPDF",
                  ...(GOOGLE_PAY_MERCHANT_ID ? { merchantId: GOOGLE_PAY_MERCHANT_ID } : {}),
                },
              });
              const token = paymentData?.paymentMethodData?.tokenizationData?.token;
              if (!token) throw new Error("Google Pay no devolvió token");
              // Google Pay's sheet just authenticated the buyer (saved
              // card + device auth) — analogous to the card 3DS step
              // for funnel parity. Fire before the backend charge.
              trackEvent("3ds_started", { method: "googlepay" });
              const gpayGc = getStoredGclid();
              const res = await chargeMut.mutateAsync({ token, amountCents, gclid: gpayGc?.id, gclidType: gpayGc?.type, lang });
              // Sandbox doesn't always echo transaction_id; fall back to our
              // own order so Google Ads still has a unique dedup key.
              const txnId = res.transactionId || res.order || `gpay-${Date.now()}`;
              onSuccess(txnId);
            } catch (err: any) {
              const msg = err?.message ?? "Error con Google Pay";
              const lower = String(msg).toLowerCase();
              const isUserCancel =
                lower.includes("canceled") ||
                lower.includes("cancelled") ||
                lower.includes("user closed") ||
                lower.includes("payment request ui") ||
                lower.includes("aborted") ||
                lower.includes("dismissed");
              // Distinguish buyer cancellations from real failures —
              // a closed GPay sheet is "cold feet", not a declined
              // card. Mixing them would inflate the failure rate.
              if (isUserCancel) {
                trackEvent("pay_canceled", { method: "googlepay" });
              } else {
                trackEvent("payment_failed", {
                  method: "googlepay",
                  decline_reason: msg.slice(0, 200),
                });
                setError(s.authFailedBody); // localized user message; raw reason in the event
              }
            } finally {
              setSubmitting(false);
            }
          },
        });
        host.appendChild(button);
      })
      .catch((err: any) => console.warn("[GPay] isReadyToPay failed:", err?.message ?? err));
  }, [scriptReady, sipayMerchantKey, amountCents, chargeMut, onSuccess]);

  // Host stays mounted always so the ref is available when the isReadyToPay
  // effect runs. We hide it (display:none) until Google confirms the buyer can
  // pay — that's when ready flips to true and createButton has appended the
  // official Google Pay button into the host.
  return (
    <div className="flex flex-col gap-2" style={ready ? {} : { display: "none" }}>
      <div ref={hostRef} style={{ height: 52 }} />
      {submitting && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin text-[#E63946]" />
          Procesando…
        </div>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
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
  converter,
  reason,
  autoTriggerGoogle,
  editorAlreadySaved,
}: PaywallModalProps) {
  const { t, lang } = useLanguage();
  const s = getAuthStrings(lang);
  const { price, withPrice } = usePricing();
  const { isAuthenticated } = useAuth();
  // Stripe was retired from the public paywall. Sipay is now the only provider
  // shown to customers; the backend Stripe code stays around so the admin
  // panel keeps reading historical data + the cron still services subscribers
  // that paid through Stripe before the migration.
  const paymentProvider: "sipay" = "sipay";
  const { savePdfToSession, setPendingPaywall, pendingFile, pendingEditedPdf, clearPendingEditedPdf, saveEditedPdfToSession } = usePdfFile();
  const [step, setStep] = useState<Step>(isAuthenticated ? "plans" : "auth-choice");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailMode, setEmailMode] = useState<"register" | "login">("register");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false); // spinner on the Google button while we upload the edited PDF + full-page redirect
  const registerMutation = trpc.auth.register.useMutation();
  const loginMutation = trpc.auth.login.useMutation();
  const { refresh } = useAuth();

  // ── Trial-limit 1-click upgrade hooks ───────────────────────
  // IMPORTANT: these MUST be called unconditionally, before any early
  // return, or React hits error #310 (hook count changes between renders).
  const [upgradeFallbackToCheckout, setUpgradeFallbackToCheckout] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const upgradeTrialNowMut = trpc.subscription.upgradeTrialNow.useMutation();
  const utils2 = trpc.useUtils();

  // Track whether we've already uploaded the doc to the dashboard during
  // this open-cycle of the modal. Set to true by either handleEmailSubmit
  // (right after register/login, before payment) or handlePaymentSuccess
  // (for already-authed users who skipped the auth step). Reset on close.
  const docSavedRef = useRef(false);

  // Fire paywall_shown exactly once per open-cycle of the modal. React
  // re-renders for any reason (auth state change, payment-method
  // selection, etc.) but the event must reflect one "modal appeared on
  // screen" per user attempt — so the ref gates it.
  const paywallShownFiredRef = useRef(false);
  // Whether the modal opened with the user NOT logged in (so they must clear
  // the register/login gate before paying) + whether we've logged that they
  // cleared it. Lets GA4 chart paywall_shown → register_completed → pay_clicked
  // and isolate the registration drop-off.
  const startedUnauthedRef = useRef(false);
  const registerFiredRef = useRef(false);
  // Holds the in-flight S3 upload of the edited PDF, started as soon as the
  // auth modal opens so the tempKey is ready by the time the user taps Google
  // (the upload was the ~3-4s wait before Google opened). Reset on close.
  const preUploadRef = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    if (!isOpen) { preUploadRef.current = null; return; }
    if (isAuthenticated || !pdfData || preUploadRef.current) return;
    preUploadRef.current = saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size).catch(() => null);
  }, [isOpen, isAuthenticated, pdfData]);
  useEffect(() => {
    if (isOpen && !paywallShownFiredRef.current) {
      startedUnauthedRef.current = !isAuthenticated;
      trackEvent("paywall_shown", {
        plan: "subscription",
        amount: INTRO_CHARGE_EUR,
        currency: INTRO_CHARGE_CURRENCY,
      });
      paywallShownFiredRef.current = true;
    }
    if (!isOpen) {
      // Reset on close so the next open fires another event.
      paywallShownFiredRef.current = false;
      registerFiredRef.current = false;
    }
  }, [isOpen]);

  // Fire register_completed once when a user who opened the paywall
  // unauthenticated becomes authenticated (they cleared the register gate).
  useEffect(() => {
    if (isOpen && isAuthenticated && startedUnauthedRef.current && !registerFiredRef.current) {
      trackEvent("register_completed", { method: "paywall" });
      registerFiredRef.current = true;
    }
  }, [isOpen, isAuthenticated]);

  // Saves the current PDF (from a landing's `buildPdfForUpload`) to the
  // user's dashboard. Idempotent via `docSavedRef` so we never create
  // duplicate rows when both the post-register and post-payment hooks
  // fire for the same modal open. Errors are logged but swallowed — a
  // failed save must not block the user's download.
  //
  // SKIP for editor flow: PdfEditor passes `pdfData` AND runs its own
  // `autoSaveDocument` on mount, so the doc is already in the panel as
  // `pending` before the paywall ever opens. Re-saving here would
  // duplicate the row. Landings only pass `buildPdfForUpload` — they
  // depend on us to do the save.
  //
  // NOTE: declared BEFORE the early return so React's hook order stays stable.
  const saveDocToDashboard = useCallback(async (): Promise<void> => {
    if (docSavedRef.current) return;
    // The editor already persisted it (its autoSaveDocument ran) → skip to
    // avoid a duplicate. Otherwise (landing flow, OR an editor user who
    // registered by EMAIL inside the modal and never triggered the editor's
    // own save) we MUST save here, or the paid doc never reaches the panel.
    if (editorAlreadySaved) return;
    const docToSave = buildPdfForUpload
      ? await buildPdfForUpload()
      : (pdfData ?? null);
    if (!docToSave || !("base64" in docToSave)) return;
    try {
      const binaryStr = atob(docToSave.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", blob, docToSave.name);
      fd.append("name", docToSave.name);
      const doPost = () => fetch("/api/documents/auto-save", { method: "POST", credentials: "include", body: fd });
      let res = await doPost();
      // Right after an email registration the session cookie can race this
      // request → 401. Wait a beat for it to settle and retry once so the paid
      // document still lands in the dashboard.
      if (res.status === 401) {
        await new Promise((r) => setTimeout(r, 1200));
        res = await doPost();
      }
      if (res.ok) docSavedRef.current = true;
      else console.warn("[PaywallModal] auto-save failed", res.status);
    } catch (err) {
      console.warn("[PaywallModal] auto-save error", err);
    }
  }, [editorAlreadySaved, buildPdfForUpload, pdfData]);

  // Reset the saved flag whenever the modal re-opens, so a user who
  // closes mid-flow and re-opens with new content gets their new doc saved.
  useEffect(() => {
    if (isOpen) docSavedRef.current = false;
  }, [isOpen]);

  // Tracks whether the autoTriggerGoogle effect has already fired in
  // this modal open-cycle so we don't re-open the OAuth popup on every
  // re-render. Reset when the modal closes.
  const googleAutoFiredRef = useRef(false);
  useEffect(() => {
    if (!isOpen) googleAutoFiredRef.current = false;
  }, [isOpen]);

  // Define handleGoogleLogin BEFORE the early return so the auto-trigger
  // useEffect can reference it. It's a plain function (not a hook) so its
  // position relative to early returns doesn't break React rules.
  const handleGoogleLogin = async () => {
    const returnPath = window.location.pathname + window.location.search;
    const authUrl = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnPath)}&popup=1`;

    // Persist the in-progress work and switch to a FULL-PAGE redirect. Used on
    // mobile (always) and as the popup-blocked fallback on desktop.
    const goRedirect = async () => {
      // Instant feedback: the S3 upload of the edited PDF + the full-page
      // redirect take a moment, and without this the button looks dead and
      // users abandon thinking it failed. goRedirect always navigates away, so
      // this never gets stuck.
      setGoogleRedirecting(true);
      // ALWAYS mark resume mode in the return URL. Even if the S3 upload fails
      // (no tk), the return then still lands in the editor with the paywall
      // open instead of dumping the user on the home page. When tk IS available
      // we also restore the edited PDF from it.
      let resumeQs = "resume=download";
      if (pdfData) {
        try {
          // Use the S3 upload we kicked off when the modal opened (preUploadRef).
          // By the time the user taps Google it's usually already done, so the
          // redirect is instant instead of waiting ~3-4s for the upload here.
          // Falls back to uploading now if the pre-upload wasn't started.
          // The edited PDF lives in S3 and its tempKey rides the OAuth return
          // URL, so it survives the cross-origin redirect (no sessionStorage).
          const tk = await (preUploadRef.current ?? saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size));
          if (tk) resumeQs += `&tk=${encodeURIComponent(tk)}&tn=${encodeURIComponent(pdfData.name)}`;
        } catch {}
      } else if (pendingFile) {
        try { await savePdfToSession(pendingFile); } catch {}
      }
      setPendingPaywall(true);
      sessionStorage.setItem("cloudpdf_pending_action", "download");
      const sep = returnPath.includes("?") ? "&" : "?";
      const returnWithResume = `${returnPath}${sep}${resumeQs}`;
      window.location.href = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnWithResume)}`;
    };

    // Mobile browsers open window.open() as a NEW TAB with no window.opener, so
    // the popup's postMessage never reaches us and the modal hangs forever on
    // the register step (the login actually completes in the other tab). Always
    // use the full-page redirect on mobile.
    const isMobile =
      window.innerWidth < 768 ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (isMobile) { await goRedirect(); return; }

    // Desktop: open Google OAuth in a popup so the editor stays open with all
    // annotations intact.
    const w = 500, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(authUrl, "google-auth", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);

    // Listen for the popup to complete login
    const onMessage = async (e: MessageEvent) => {
      // The OAuth callback runs on the APEX (editorpdf.net) because that's the
      // only registered redirect_uri, but the opener is usually on WWW. So the
      // popup's postMessage arrives with e.origin = apex while our origin is www
      // → a strict `e.origin === window.location.origin` check silently drops it
      // and the modal hangs. Accept the whole editorpdf.net family.
      const okOrigin =
        e.origin === window.location.origin ||
        e.origin === "https://editorpdf.net" ||
        e.origin === "https://www.editorpdf.net";
      if (!okOrigin) return;
      if (e.data?.type !== "google-auth-success") return;
      window.removeEventListener("message", onMessage);
      // Refresh auth state — the session cookie was set by the popup
      await refresh();
    };
    window.addEventListener("message", onMessage);

    // Fallback: if the popup was blocked, redirect instead.
    if (!popup || popup.closed) {
      window.removeEventListener("message", onMessage);
      await goRedirect();
    }
  };

  // Auto-fire the Google OAuth popup when the parent opens the modal
  // with autoTriggerGoogle=true (the "Descargar con Google" dropdown
  // option in the editor). Only fires once per modal open cycle and
  // only if the user is not already authenticated.
  useEffect(() => {
    if (!isOpen || !autoTriggerGoogle || isAuthenticated) return;
    if (googleAutoFiredRef.current) return;
    googleAutoFiredRef.current = true;
    handleGoogleLogin();
    // handleGoogleLogin is stable for the lifetime of this open cycle —
    // safe to ignore the lint warning about the dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoTriggerGoogle, isAuthenticated]);

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;
  const effectivePdfData = pdfData ?? pendingEditedPdf ?? undefined;

  const handleEmailSubmit = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) { toast.error(t.paywall_enter_email); return; }
    if (!passwordInput || passwordInput.length < 6) { toast.error(t.paywall_password_min); return; }
    // Consent is implicit via the legal text under the submit button — no
    // blocking checkbox required (pdfe-style UX).
    setEmailLoading(true);
    try {
      if (emailMode === "register") {
        await registerMutation.mutateAsync({ email: emailInput.trim(), password: passwordInput, name: nameInput.trim() || undefined });
      } else {
        await loginMutation.mutateAsync({ email: emailInput.trim(), password: passwordInput });
      }
      await refresh();
      await saveDocToDashboard();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePaymentSuccess = (transactionId?: string) => {
    // Critical: also save the doc for already-authenticated users who
    // skipped the registration step entirely. Without this their paid
    // download never lands in the dashboard panel. Fire-and-forget so
    // a slow upload never delays the close+redirect.
    saveDocToDashboard().catch((err) => console.warn("[PaywallModal] post-payment save failed", err));
    clearPendingEditedPdf();
    onClose();
    if (onPaymentSuccess) onPaymentSuccess(transactionId);
  };

  // ── Trial-limit 1-click upgrade handler (hooks already declared above) ──
  const handleUpgradeNow = async () => {
    setUpgradeError(null);
    try {
      const r = await upgradeTrialNowMut.mutateAsync();
      if (r.success) {
        toast.success("¡Suscripción activada! Ya puedes seguir descargando.");
        await Promise.all([
          utils2.subscription.status.invalidate(),
          utils2.subscription.trialUsage.invalidate(),
        ]);
        onClose();
        if (onPaymentSuccess) onPaymentSuccess();
        return;
      }
      // Server distinguishes recoverable card issues from everything else.
      // Only fall back to the full Stripe checkout when entering a different
      // card might actually fix the problem.
      const code = (r as any).code;
      if (code === "CARD_ERROR") {
        toast.error(r.error || "La tarjeta fue rechazada. Introduce otra.");
        setUpgradeFallbackToCheckout(true);
      } else {
        // FAKE_QA_SUB / NO_SUB / NO_STRIPE_ID / STRIPE_ERROR → show inline.
        setUpgradeError(r.error || "No pudimos activar tu suscripción ahora mismo.");
      }
    } catch (err) {
      setUpgradeError((err as Error).message || "Error al activar la suscripción.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        /* 100dvh = dynamic viewport height; respects iOS Safari's retracting
           URL bar so the modal never gets cut off. The vh declaration is the
           older-browser fallback (Safari <15.4, Chrome <108). */
        .paywall-modal-shell {
          max-height: 100vh;
          max-height: 100dvh;
          /* Respect iPhone notch / Android nav bar at the modal edges */
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
      <div
        className="paywall-modal-shell relative w-full bg-white shadow-2xl overflow-hidden md:rounded-2xl"
        style={{
          maxWidth: currentStep === "plans" ? 880 : 480,
          overflowY: "auto",
        }}
      >
        {/* Close — honors iOS safe-area-inset-top so the button doesn't sit
            under the notch / dynamic island when the modal is fullscreen on
            mobile. */}
        <button
          onClick={onClose}
          className="absolute z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-slate-100 transition-colors border border-slate-200"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            right: "calc(env(safe-area-inset-right, 0px) + 12px)",
          }}
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* ── Trial-limit reached (1-click upgrade) ── */}
        {reason === "trial-limit" && !upgradeFallbackToCheckout && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center mx-auto mb-4 relative">
                <Lock className="w-7 h-7 text-white" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {(t as any).paywall_trial_limit_title ?? "Has usado tus 2 PDFs del trial"}
              </h2>
              <p className="text-sm text-gray-500">
                {withPrice((t as any).paywall_trial_limit_body) || `Activa tu suscripción mensual por ${price} para seguir procesando PDFs sin límite.`}
              </p>
            </div>

            {/* Pricing highlight */}
            <div className="max-w-sm mx-auto rounded-xl p-5 text-center mb-5" style={{ background: "linear-gradient(135deg, #1E66C9, #1551A8)" }}>
              <p className="text-sm text-white/70 mb-1">{(t as any).paywall_trial_limit_card_label ?? "Suscripción mensual"}</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                <span style={{ color: "#E63946" }}>{price}</span>
                <span className="text-base text-white/50 font-normal ml-1">{(t as any).paywall_trial_limit_per_month ?? "/mes"}</span>
              </p>
              <p className="text-xs text-white/60 mt-2">{(t as any).paywall_trial_limit_charge_note ?? "Se cobrará ahora a tu tarjeta guardada"}</p>
            </div>

            <div className="max-w-sm mx-auto space-y-2">
              <button
                onClick={handleUpgradeNow}
                disabled={upgradeTrialNowMut.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm hover:bg-[#C72738] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: upgradeTrialNowMut.isPending ? "#9ca3af" : "#E63946" }}
              >
                {upgradeTrialNowMut.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activando…</>
                ) : (
                  withPrice((t as any).paywall_trial_limit_cta) || `Activar suscripción (${price}/mes)`
                )}
              </button>
              {upgradeError && (
                <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                  <p className="font-semibold mb-1">{(t as any).paywall_trial_limit_error_title ?? "No se pudo activar la suscripción"}</p>
                  <p>{upgradeError}</p>
                </div>
              )}
              <p className="text-[10px] text-center text-gray-400 leading-relaxed">
                {(t as any).paywall_trial_limit_disclaimer ?? "Puedes cancelar en cualquier momento desde tu panel. Sin permanencia."}
              </p>
            </div>
          </div>
        )}

        {/* ── Unified Auth (Email/Password first + Google + GDPR) ──
            Layout cloned from pdfe.com: small "Último paso" eyebrow at
            top, big heading "Crea una cuenta para descargar tu documento",
            subtitle about social/email, email + password form FIRST,
            then a divider, then Google as alternative. Same DB writes
            underneath as before — only ordering + copy changed. */}
        {reason !== "trial-limit" && currentStep === "auth-choice" && (
          <div className="p-8">
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 mb-2">
                {emailMode === "register" ? t.paywall_auth_eyebrow : ""}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mb-1.5 leading-tight">
                {emailMode === "register" ? t.paywall_auth_heading : t.paywall_login}
              </h2>
              <p className="text-sm text-gray-500">
                {emailMode === "register" ? t.paywall_auth_subtitle : t.paywall_enter_email}
              </p>
            </div>
            <div className="max-w-sm mx-auto space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Email</label>
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="tu@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{t.paywall_password}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder={emailMode === "register" ? t.paywall_password_min : t.paywall_password} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]" onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleEmailSubmit}
                disabled={emailLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm hover:bg-[#C72738] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: emailLoading ? "#9ca3af" : "#E63946" }}
              >
                {/* Pdfe-style: button explicitly says "Crear cuenta" so
                    the user understands the action. Honesty + match the
                    rest of the modal copy that frames this as a signup. */}
                {emailLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {emailMode === "register" ? t.paywall_registering : t.paywall_logging_in}</>
                  : (emailMode === "register" ? t.paywall_auth_create : t.paywall_login)
                }
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t.paywall_or}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => handleGoogleLogin()}
                disabled={googleRedirecting}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm bg-white hover:border-gray-400 transition-all cursor-pointer text-gray-700 disabled:opacity-70 disabled:cursor-wait"
              >
                {googleRedirecting ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin text-[#E63946]" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                )}
                {googleRedirecting
                  ? (t.paywall_google_connecting ?? "Conectando…")
                  : (emailMode === "register" ? t.paywall_auth_create_google : t.paywall_continue_google)}
              </button>
              <div className="text-center text-sm text-gray-500 pt-1">
                {emailMode === "register"
                  ? <>{t.paywall_auth_have_account} · <button onClick={() => setEmailMode("login")} className="text-[#E63946] font-semibold hover:underline">{t.paywall_login}</button></>
                  : <>{t.paywall_no_account}{" "}<button onClick={() => setEmailMode("register")} className="text-[#E63946] font-semibold hover:underline">{t.paywall_register}</button></>}
              </div>
              {emailMode === "register" && (
                <p className="text-[11px] text-center text-gray-400 leading-relaxed pt-2 border-t" style={{ borderColor: "#f1f5f9" }}>
                  {s.gdprPrefix}{" "}
                  <a href={`/${lang}/terms`} target="_blank" rel="noreferrer" className="underline text-gray-500 hover:text-[#E63946]">
                    {s.termsLinkLabel}
                  </a>
                  {s.gdprAnd}
                  <a href={`/${lang}/privacy`} target="_blank" rel="noreferrer" className="underline text-gray-500 hover:text-[#E63946]">
                    {s.privacyLinkLabel}
                  </a>
                  {s.gdprSuffix}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Payment step ── Sipay only (Stripe retired) ── */}
        {(reason !== "trial-limit" || upgradeFallbackToCheckout) && currentStep === "plans" && (
          <SipayCheckoutForm
            onSuccess={handlePaymentSuccess}
            onClose={onClose}
            pdfData={effectivePdfData}
            thumbnailUrl={thumbnailUrl}
            buildPdfForUpload={buildPdfForUpload}
            converter={converter}
          />
        )}
      </div>
    </div>
  );
}

/*
 * PaywallModal — Sipay (FastPay + 3DS Redsys) payment with PDF preview.
 * Two-column layout: PDF preview (left) + payment form (right).
 * Stripe was retired from the public paywall.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { colors } from "@/lib/brand";
import { X, Check, Loader2, Mail, CreditCard, ArrowRight, Eye, EyeOff, Lock, Shield, FileText, ChevronDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricing } from "@/lib/usePricing";
import { getAuthStrings } from "@/lib/authModalStrings";

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
}

type Step = "auth-choice" | "plans";

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

// ── Sipay checkout ─────────────────────────────────────────────────────────────
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
  const [redirecting, setRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Collapsed by default. The user picks "Tarjeta de crédito o débito" to
  // expand the FastPay iframe. Auto-opening on mount triggers FastPay's
  // mobile new-tab fallback in some scenarios; making the user opt-in keeps
  // the iframe inline and matches the UX on mindmetric.io.
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
  }, [sipayConfigQ.data?.bundleUrl]);

  // 2) Expose a global callback for FastPay to invoke when the card is captured.
  useEffect(() => {
    (window as any).__editorpdfFastpayResult = (resp: any) => {
      console.log("[Sipay] FastPay result:", resp);
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

    try {
      if (typeof fp.customize === "function") {
        fp.customize({
          color: "#E63946",
          primaryColor: "#E63946",
          buttonColor: "#E63946",
          accentColor: "#E63946",
          theme: "red",
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

    return () => clearTimeout(timer);
  }, [scriptReady, sipayConfigQ.data?.key, cardExpanded]);

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
    initMut
      .mutateAsync({ fastpayRequestId: fpId, amountCents: 50 })
      .then((res) => {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        } else {
          setAuthError("Sipay no devolvió URL de 3DS.");
          setRedirecting(false);
        }
      })
      .catch((err) => {
        setAuthError(err?.message ?? "Error autorizando el pago.");
        setRedirecting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastpayResult]);

  return (
    <div className="flex flex-col md:flex-row min-h-0">
      {/* ── PDF preview column (same as Stripe) ── */}
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
            <p className="text-xs font-semibold text-slate-800">{(t as any).paywall_doc_ready ?? "Your document is ready!"}</p>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{pdfData?.name ?? "document.pdf"}</p>
        </div>
      </div>
      <div className="hidden md:flex flex-col items-center justify-center bg-[#f4f5f7] p-8" style={{ minWidth: 260, maxWidth: 280 }}>
        <div className="flex items-center gap-2 mb-5 w-full">
          <div className="w-6 h-6 rounded-full bg-[#1E9E63] flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-white" /></div>
          <p className="text-sm font-semibold text-slate-800">{(t as any).paywall_doc_ready ?? "Your document is ready!"}</p>
        </div>
        <div className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center mb-3" style={{ aspectRatio: "0.707", maxHeight: 220 }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Document preview" className="w-full h-full object-contain" />
          ) : (
            <div className="flex items-center justify-center w-full h-full"><span className="text-red-400 text-xs font-bold">PDF</span></div>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center truncate w-full font-medium">{pdfData?.name ?? "document.pdf"}</p>
      </div>

      {/* ── Payment column ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="px-3 py-4 md:px-6 md:py-5 space-y-4 md:space-y-5">
          {/* Pricing breakdown */}
          <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, #0A0A0B, #1A1A1C)" }}>
            <p className="text-sm text-white/70 mb-1">{converter ? `Your ${converter.label} file` : t.paywall_your_pdf}</p>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {converter ? <>only <span style={{ color: "#E63946" }}>{converter.price}</span></> : t.paywall_only_for}
            </p>
          </div>

          {/* FastPay button + loading + redirect overlay */}
          {!sipayConfigQ.data?.key && (
            <p className="text-sm text-gray-500 text-center">Cargando configuración…</p>
          )}
          {sipayConfigQ.data?.key && (
            <div className="flex flex-col items-stretch gap-3">
              {/* Google Pay button — only shown when Sipay account has a Google
                  Pay merchant configured. Auto-detects user readiness. */}
              <GooglePayButton
                sipayMerchantKey={sipayConfigQ.data.key}
                amountCents={50}
                onSuccess={(txn) => {
                  window.location.href = `/payment/success?txn=${encodeURIComponent(txn)}&provider=sipay-gpay`;
                }}
              />

              {/* Card / debit collapsible row — clicking it expands the FastPay
                  iframe inline. Keeping it collapsed by default avoids the mobile
                  new-tab fallback and matches the UX on mindmetric.io. */}
              <button
                type="button"
                onClick={() => setCardExpanded((v) => !v)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="flex items-center gap-2 text-sm text-gray-800">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  {s.cardOption}
                </span>
                <ChevronDown
                  className="w-4 h-4 text-gray-500 transition-transform"
                  style={{ transform: cardExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>

              {cardExpanded && !scriptReady && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E63946]" />
                  {s.loading}
                </div>
              )}
              {cardExpanded && (
              <>
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
                /* Keep the iframe inline on mobile (default FastPay opens a
                   new tab on small screens). Confirmed working on mindmetric.io
                   which uses the same Sipay merchant. */
                data-notab="true"
                /* Hide cardholder name field — not needed for our flow. */
                data-cardholdername="false"
                /* Try to omit the "Recordar datos" toggle. The FastPay JS
                   reads several data-* keys for this; none are documented,
                   so we set the most likely candidates at once. */
                data-remember=""
                data-autosave="false"
                data-hideremember="true"
                data-noremember="true"
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
                .fastpay-btn + iframe {
                  display: block !important;
                  width: 100% !important;
                  min-height: 720px !important;
                  border: 0 !important;
                  background: transparent !important;
                  position: relative !important;
                  top: 0 !important;
                  left: 0 !important;
                  overflow: hidden !important;
                }
              `}</style>
              </>
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
                  <p>{s.authFailedBody}</p>
                </div>
              )}
            </div>
          )}

          {/* Trust strip — sin iconos de marca duplicados (el iframe Sipay ya los muestra) */}
          <div className="flex items-center justify-center gap-5 text-[11px] text-gray-500 pt-2 border-t" style={{ borderColor: "#e5e7eb" }}>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {s.trust3ds}</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {s.trustPci}</span>
          </div>

          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 underline text-center w-full">
            {s.cancel}
          </button>
        </div>
      </div>
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
    // Stay in TEST until Google approves our domain at pay.google.com and
    // gives us the merchantId. PRODUCTION without merchantId hides the
    // button entirely (silent failure), which would block the screenshot
    // approval flow we need to send Google.
    const GOOGLE_PAY_MERCHANT_ID = ""; // TODO: paste here after approval
    const isProd =
      window.location.hostname === "editorpdf.net" && !!GOOGLE_PAY_MERCHANT_ID;
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
          buttonColor: "black",
          buttonType: "pay",
          buttonRadius: 10,
          buttonSizeMode: "fill",
          onClick: async () => {
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
              const res = await chargeMut.mutateAsync({ token, amountCents });
              if (res.transactionId) onSuccess(res.transactionId);
              else throw new Error("Sipay no devolvió transaction_id");
            } catch (err: any) {
              const msg = err?.message ?? "Error con Google Pay";
              if (!String(msg).includes("CANCELED")) setError(msg);
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
      <div ref={hostRef} style={{ minHeight: 44 }} />
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

  if (!isOpen) return null;

  const currentStep = isAuthenticated ? "plans" : step;
  const effectivePdfData = pdfData ?? pendingEditedPdf ?? undefined;

  const handleGoogleLogin = async () => {
    const returnPath = window.location.pathname + window.location.search;
    const authUrl = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(returnPath)}&popup=1`;

    // Open Google OAuth in a popup — the editor stays open and keeps all annotations
    const w = 500, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(authUrl, "google-auth", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);

    // Listen for the popup to complete login
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "google-auth-success") return;
      window.removeEventListener("message", onMessage);
      // Refresh auth state — the session cookie was set by the popup
      await refresh();
    };
    window.addEventListener("message", onMessage);

    // Fallback: if popup was blocked, fall back to redirect
    if (!popup || popup.closed) {
      window.removeEventListener("message", onMessage);
      if (pendingFile) { try { await savePdfToSession(pendingFile); } catch {} }
      if (pdfData) { try { await saveEditedPdfToSession(pdfData.base64, pdfData.name, pdfData.size); } catch {} }
      setPendingPaywall(true);
      sessionStorage.setItem("cloudpdf_pending_action", "download");
      window.location.href = authUrl.replace("&popup=1", "");
    }
  };

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
      <div
        className="relative w-full bg-white shadow-2xl overflow-hidden md:rounded-2xl"
        style={{ maxWidth: currentStep === "plans" ? 880 : 480, maxHeight: "100vh", overflowY: "auto" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-slate-100 transition-colors border border-slate-200"
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
            <div className="max-w-sm mx-auto rounded-xl p-5 text-center mb-5" style={{ background: "linear-gradient(135deg, #0A0A0B, #1A1A1C)" }}>
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

        {/* ── Unified Auth (Google + email/password + GDPR) ── */}
        {reason !== "trial-limit" && currentStep === "auth-choice" && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#0A0A0B] flex items-center justify-center mx-auto mb-4 relative">
                <FileText className="w-7 h-7 text-white" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E63946] ring-2 ring-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{emailMode === "register" ? s.paywallTitle : t.paywall_login}</h2>
              <p className="text-sm text-gray-500">
                {converter
                  ? `to download your ${converter.label} file`
                  : (emailMode === "register" ? s.paywallSubtitle : t.paywall_enter_email)}
              </p>
            </div>
            <div className="max-w-sm mx-auto space-y-3">
              <div className="relative group">
              <button
                onClick={() => handleGoogleLogin()}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-sm bg-white hover:border-gray-400 transition-all cursor-pointer text-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {t.paywall_continue_google}
              </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t.paywall_or}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
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
                {emailLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> {emailMode === "register" ? t.paywall_registering : t.paywall_logging_in}</> : (emailMode === "register" ? t.paywall_register : t.paywall_login)}
              </button>
              <div className="text-center text-sm text-gray-500 pt-1">
                {emailMode === "register"
                  ? <>{t.paywall_have_account}{" "}<button onClick={() => setEmailMode("login")} className="text-[#E63946] font-semibold hover:underline">{t.paywall_login}</button></>
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

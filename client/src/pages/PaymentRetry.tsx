import { useEffect } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/lib/track";
import { readPendingCheckout, clearPendingCheckout, withReopenFlag } from "@/lib/pendingCheckout";

// Landing page for a failed card payment (3DS declined/cancelled at the bank →
// url_ko, or the confirm was rejected). Replaces the old bare "/" redirect that
// left the user confused with no explanation and no way back to their document.
//
// Copy lives in a local map (same pattern as ContactModal / ApplePayButton) so it
// ships translated without touching the giant i18n.ts. Unlisted langs fall back
// to English.
const STRINGS: Record<string, { title: string; bank: string; generic: string; kept: string; retry: string; home: string }> = {
  es: {
    title: "No se completó el pago",
    bank: "No se completó la verificación con tu banco. Tu tarjeta no ha sido cobrada. Puedes intentarlo de nuevo.",
    generic: "No pudimos procesar el pago. Tu tarjeta no ha sido cobrada. Puedes intentarlo de nuevo.",
    kept: "Tu documento sigue guardado — no tienes que volver a subirlo.",
    retry: "Reintentar el pago",
    home: "Volver al inicio",
  },
  en: {
    title: "Payment didn’t go through",
    bank: "The verification with your bank wasn’t completed. Your card was not charged. You can try again.",
    generic: "We couldn’t process the payment. Your card was not charged. You can try again.",
    kept: "Your document is still saved — no need to upload it again.",
    retry: "Try the payment again",
    home: "Back to home",
  },
  fr: {
    title: "Le paiement n’a pas abouti",
    bank: "La vérification avec votre banque n’a pas été finalisée. Votre carte n’a pas été débitée. Vous pouvez réessayer.",
    generic: "Nous n’avons pas pu traiter le paiement. Votre carte n’a pas été débitée. Vous pouvez réessayer.",
    kept: "Votre document est toujours enregistré — inutile de le téléverser à nouveau.",
    retry: "Réessayer le paiement",
    home: "Retour à l’accueil",
  },
  de: {
    title: "Zahlung nicht abgeschlossen",
    bank: "Die Verifizierung bei Ihrer Bank wurde nicht abgeschlossen. Ihre Karte wurde nicht belastet. Sie können es erneut versuchen.",
    generic: "Die Zahlung konnte nicht verarbeitet werden. Ihre Karte wurde nicht belastet. Sie können es erneut versuchen.",
    kept: "Ihr Dokument ist weiterhin gespeichert — Sie müssen es nicht erneut hochladen.",
    retry: "Zahlung erneut versuchen",
    home: "Zurück zur Startseite",
  },
  pt: {
    title: "O pagamento não foi concluído",
    bank: "A verificação com o seu banco não foi concluída. O seu cartão não foi cobrado. Pode tentar novamente.",
    generic: "Não foi possível processar o pagamento. O seu cartão não foi cobrado. Pode tentar novamente.",
    kept: "O seu documento continua guardado — não precisa de o enviar novamente.",
    retry: "Tentar o pagamento de novo",
    home: "Voltar ao início",
  },
  it: {
    title: "Pagamento non riuscito",
    bank: "La verifica con la tua banca non è stata completata. La tua carta non è stata addebitata. Puoi riprovare.",
    generic: "Non è stato possibile elaborare il pagamento. La tua carta non è stata addebitata. Puoi riprovare.",
    kept: "Il tuo documento è ancora salvato — non serve caricarlo di nuovo.",
    retry: "Riprova il pagamento",
    home: "Torna alla home",
  },
};

export default function PaymentRetry() {
  const { lang } = useLanguage();
  const s = STRINGS[lang] ?? STRINGS.en;
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "";
  const isBank = reason === "ko" || reason === "confirm_failed";

  useEffect(() => {
    trackEvent("payment_failed", { method: "card", decline_reason: `retry_page:${reason || "unknown"}` });
  }, [reason]);

  const onRetry = () => {
    const pending = readPendingCheckout();
    clearPendingCheckout();
    if (pending?.href) {
      // Back to the exact page (with its doc temp key) + a flag to reopen checkout.
      window.location.href = withReopenFlag(pending.href);
    } else {
      window.location.href = `/${lang}`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0A0A0B" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#FEE7EA" }}>
          <ShieldAlert className="h-7 w-7" style={{ color: "#E63946" }} />
        </div>
        <h1 className="mb-2 text-xl font-extrabold text-slate-900">{s.title}</h1>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">{isBank ? s.bank : s.generic}</p>
        <p className="mb-6 text-xs font-medium text-slate-500">{s.kept}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-95"
          style={{ background: "#E63946" }}
        >
          <RefreshCw className="h-4 w-4" />
          {s.retry}
        </button>
        <a
          href={`/${lang}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <Home className="h-4 w-4" />
          {s.home}
        </a>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Home, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/lib/track";
import PaywallModal from "@/components/PaywallModal";
import { readPendingCheckout } from "@/lib/pendingCheckout";

// Landing page for a failed card payment (3DS declined/cancelled at the bank →
// url_ko, or the confirm was rejected). Replaces the old bare "/" redirect that
// left the user on a blank home with no explanation.
//
// One-click recovery: "Try again" opens the checkout RIGHT HERE (hosted
// PaywallModal). The user is already authenticated (they registered before the
// failed attempt), so the modal goes straight to the payment step; on success
// /payment/success recovers the document that was saved before the attempt.
// This is the whole point — these users are 100% lost today.
//
// Copy lives in a local map (same pattern as ContactModal / ApplePayButton) so it
// ships fully translated without touching the giant i18n.ts. ALL 12 site
// languages are covered (es, en, fr, de, pt, it, nl, pl, ru, uk, ro, zh).
type Copy = { title: string; bank: string; generic: string; kept: string; retry: string; backDoc: string; home: string };
const STRINGS: Record<string, Copy> = {
  es: { title: "No se completó el pago", bank: "No se completó la verificación con tu banco. Tu tarjeta no ha sido cobrada. Puedes intentarlo de nuevo.", generic: "No pudimos procesar el pago. Tu tarjeta no ha sido cobrada. Puedes intentarlo de nuevo.", kept: "Tu documento sigue guardado — no tienes que volver a subirlo.", retry: "Reintentar el pago", backDoc: "Volver a tu documento", home: "Volver al inicio" },
  en: { title: "Payment didn’t go through", bank: "The verification with your bank wasn’t completed. Your card was not charged. You can try again.", generic: "We couldn’t process the payment. Your card was not charged. You can try again.", kept: "Your document is still saved — no need to upload it again.", retry: "Try the payment again", backDoc: "Back to your document", home: "Back to home" },
  fr: { title: "Le paiement n’a pas abouti", bank: "La vérification avec votre banque n’a pas été finalisée. Votre carte n’a pas été débitée. Vous pouvez réessayer.", generic: "Nous n’avons pas pu traiter le paiement. Votre carte n’a pas été débitée. Vous pouvez réessayer.", kept: "Votre document est toujours enregistré — inutile de le téléverser à nouveau.", retry: "Réessayer le paiement", backDoc: "Revenir à votre document", home: "Retour à l’accueil" },
  de: { title: "Zahlung nicht abgeschlossen", bank: "Die Verifizierung bei Ihrer Bank wurde nicht abgeschlossen. Ihre Karte wurde nicht belastet. Sie können es erneut versuchen.", generic: "Die Zahlung konnte nicht verarbeitet werden. Ihre Karte wurde nicht belastet. Sie können es erneut versuchen.", kept: "Ihr Dokument ist weiterhin gespeichert — Sie müssen es nicht erneut hochladen.", retry: "Zahlung erneut versuchen", backDoc: "Zurück zu Ihrem Dokument", home: "Zurück zur Startseite" },
  pt: { title: "O pagamento não foi concluído", bank: "A verificação com o seu banco não foi concluída. O seu cartão não foi cobrado. Pode tentar novamente.", generic: "Não foi possível processar o pagamento. O seu cartão não foi cobrado. Pode tentar novamente.", kept: "O seu documento continua guardado — não precisa de o enviar novamente.", retry: "Tentar o pagamento de novo", backDoc: "Voltar ao seu documento", home: "Voltar ao início" },
  it: { title: "Pagamento non riuscito", bank: "La verifica con la tua banca non è stata completata. La tua carta non è stata addebitata. Puoi riprovare.", generic: "Non è stato possibile elaborare il pagamento. La tua carta non è stata addebitata. Puoi riprovare.", kept: "Il tuo documento è ancora salvato — non serve caricarlo di nuovo.", retry: "Riprova il pagamento", backDoc: "Torna al tuo documento", home: "Torna alla home" },
  nl: { title: "Betaling niet voltooid", bank: "De verificatie bij je bank is niet voltooid. Je kaart is niet belast. Je kunt het opnieuw proberen.", generic: "We konden de betaling niet verwerken. Je kaart is niet belast. Je kunt het opnieuw proberen.", kept: "Je document is nog opgeslagen — je hoeft het niet opnieuw te uploaden.", retry: "Betaling opnieuw proberen", backDoc: "Terug naar je document", home: "Terug naar start" },
  pl: { title: "Płatność nie powiodła się", bank: "Weryfikacja w Twoim banku nie została ukończona. Twoja karta nie została obciążona. Możesz spróbować ponownie.", generic: "Nie udało się przetworzyć płatności. Twoja karta nie została obciążona. Możesz spróbować ponownie.", kept: "Twój dokument jest nadal zapisany — nie musisz go przesyłać ponownie.", retry: "Spróbuj zapłacić ponownie", backDoc: "Wróć do swojego dokumentu", home: "Powrót do strony głównej" },
  ru: { title: "Платёж не прошёл", bank: "Проверка в вашем банке не была завершена. Деньги с карты не списаны. Вы можете попробовать снова.", generic: "Не удалось обработать платёж. Деньги с карты не списаны. Вы можете попробовать снова.", kept: "Ваш документ сохранён — загружать его заново не нужно.", retry: "Повторить оплату", backDoc: "Вернуться к документу", home: "На главную" },
  uk: { title: "Платіж не пройшов", bank: "Перевірку у вашому банку не було завершено. Кошти з картки не списано. Ви можете спробувати ще раз.", generic: "Не вдалося обробити платіж. Кошти з картки не списано. Ви можете спробувати ще раз.", kept: "Ваш документ збережено — завантажувати його знову не потрібно.", retry: "Повторити оплату", backDoc: "Повернутися до документа", home: "На головну" },
  ro: { title: "Plata nu a fost finalizată", bank: "Verificarea cu banca ta nu a fost finalizată. Cardul tău nu a fost debitat. Poți încerca din nou.", generic: "Nu am putut procesa plata. Cardul tău nu a fost debitat. Poți încerca din nou.", kept: "Documentul tău este încă salvat — nu trebuie să îl încarci din nou.", retry: "Încearcă plata din nou", backDoc: "Înapoi la documentul tău", home: "Înapoi la pagina principală" },
  zh: { title: "支付未完成", bank: "未能完成银行验证。您的银行卡未被扣款。您可以重试。", generic: "无法处理支付。您的银行卡未被扣款。您可以重试。", kept: "您的文档仍已保存——无需重新上传。", retry: "重新支付", backDoc: "返回您的文档", home: "返回首页" },
};

export default function PaymentRetry() {
  const { lang } = useLanguage();
  const s = STRINGS[lang] ?? STRINGS.en;
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "";
  const isBank = reason === "ko" || reason === "confirm_failed";
  const [payOpen, setPayOpen] = useState(false);
  const pending = readPendingCheckout();

  useEffect(() => {
    trackEvent("payment_failed", { method: "card", decline_reason: `retry_page:${reason || "unknown"}` });
  }, [reason]);

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
          onClick={() => setPayOpen(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-95"
          style={{ background: "#E63946" }}
        >
          <RefreshCw className="h-4 w-4" />
          {s.retry}
        </button>

        {pending?.href && (
          <a
            href={pending.href}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <FileText className="h-4 w-4" />
            {s.backDoc}
          </a>
        )}
        <a
          href={`/${lang}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <Home className="h-4 w-4" />
          {s.home}
        </a>
      </div>

      {/* Hosted checkout — reopens the payment right here. Authenticated users go
          straight to the payment step; on success /payment/success recovers the
          document saved before the failed attempt. */}
      <PaywallModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        onPaymentSuccess={(txn) => {
          window.location.href = `/${lang}/payment/success${txn ? `?txn=${encodeURIComponent(txn)}` : ""}`;
        }}
      />
    </div>
  );
}

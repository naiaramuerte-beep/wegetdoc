import { useEffect } from "react";
import { toast } from "sonner";

/**
 * When a card + 3DS payment fails, Sipay's callback redirects the browser to
 * `/?sipay=confirm_failed` (or `server_error` / `missing_request_id` / an
 * `?sipay_error=` code). Nothing on the client read those params, so the user
 * landed on the home page with NO feedback and thought the payment went through
 * ("me ha aceptado"). This surfaces a clear message — and reassures them no
 * money was taken — then strips the param so a refresh doesn't repeat it.
 */
const FAIL_MSG: Record<string, string> = {
  es: "No se pudo completar el pago y no se te ha cobrado nada. Vuelve a intentarlo o prueba con otra tarjeta.",
  en: "The payment couldn't be completed and you were not charged. Please try again or use another card.",
  fr: "Le paiement n'a pas pu être effectué et vous n'avez pas été débité. Réessayez ou utilisez une autre carte.",
  de: "Die Zahlung konnte nicht abgeschlossen werden und es wurde nichts berechnet. Bitte versuchen Sie es erneut oder mit einer anderen Karte.",
  pt: "Não foi possível concluir o pagamento e não foi cobrado nada. Tente novamente ou use outro cartão.",
  it: "Non è stato possibile completare il pagamento e non ti è stato addebitato nulla. Riprova o usa un'altra carta.",
  nl: "De betaling kon niet worden voltooid en er is niets in rekening gebracht. Probeer het opnieuw of gebruik een andere kaart.",
  pl: "Nie udało się zrealizować płatności i nic nie zostało pobrane. Spróbuj ponownie lub użyj innej karty.",
  ru: "Не удалось завершить платёж, средства не списаны. Попробуйте снова или используйте другую карту.",
  uk: "Не вдалося завершити платіж, кошти не списано. Спробуйте ще раз або скористайтеся іншою карткою.",
  ro: "Plata nu a putut fi finalizată și nu ai fost taxat. Încearcă din nou sau folosește alt card.",
  zh: "支付未能完成，未向您收取任何费用。请重试或使用其他卡。",
};

export default function PaymentResultToast() {
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const sipay = p.get("sipay");
      const sipayErr = p.get("sipay_error");
      const isFailure =
        (sipay && ["confirm_failed", "server_error", "missing_request_id"].includes(sipay)) ||
        !!sipayErr;
      if (!isFailure) return;

      const m = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const lang = m ? m[1] : "es";
      toast.error(FAIL_MSG[lang] ?? FAIL_MSG.en, { duration: 7000 });

      // Strip the payment params so a refresh doesn't re-show the toast.
      p.delete("sipay");
      p.delete("sipay_error");
      p.delete("detail");
      const qs = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
    } catch {
      /* best-effort */
    }
  }, []);
  return null;
}

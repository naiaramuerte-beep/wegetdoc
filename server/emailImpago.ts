/* =============================================================
   Aviso de cobro fallido (impago)
   =============================================================

   El agujero que tapa esto: cuando a un cliente le rechazan la renovación, hoy
   NADIE se lo dice. El cron reintenta en silencio y al final la suscripción se
   cancela sola. Medido el 2026-08-19: 198 suscripciones en impago (5.910 €/mes),
   253 personas con un cobro rechazado en 10 días, y CERO avisos enviados.

   Y no es que no quieran pagar: la mayoría de esos rechazos son código 190, un
   banco denegando un cargo SIN autenticación a alguien que sí tiene fondos. Está
   medido en las altas — al mismo cliente al que le tumban el wallet, la tarjeta
   con 3DS le pasa 1-8 minutos después. Basta con darles dónde pagar.

   El botón lleva el auto-login firmado (mismo mecanismo que el correo de
   recuperación) para que no se topen con un muro de login. Va en los 12 idiomas
   del sitio.
   ============================================================= */

import { Resend } from "resend";
import { brandName } from "./brand";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = `${brandName} <support@editorpdf.net>`;

type ImpagoLang = {
  subject: string;
  title: string;
  /** {amount} = importe con su moneda, ya formateado. */
  body: string;
  why: string;
  cta: string;
  keep: string;
  bye: string;
};

export const IMPAGO_STRINGS: Record<string, ImpagoLang> = {
  es: {
    subject: "No hemos podido cobrar tu suscripcion",
    title: "Tu pago no ha pasado",
    body: "El banco ha rechazado el cargo de {amount} de tu suscripcion, asi que tu acceso esta pausado.",
    why: "Casi siempre es el banco rechazando un cobro automatico, no falta de saldo. Si pagas desde la web, tu banco lo confirma en el momento y entra sin problema.",
    cta: "Reactivar mi suscripcion",
    keep: "Tus documentos siguen guardados en tu cuenta.",
    bye: "Soporte EditorPDF",
  },
  en: {
    subject: "We couldn't charge your subscription",
    title: "Your payment didn't go through",
    body: "Your bank declined the {amount} charge for your subscription, so your access is paused.",
    why: "This is almost always the bank refusing an automatic charge, not a lack of funds. If you pay from the site, your bank confirms it on the spot and it goes through.",
    cta: "Reactivate my subscription",
    keep: "Your documents are still saved in your account.",
    bye: "EditorPDF Support",
  },
  fr: {
    subject: "Nous n'avons pas pu debiter votre abonnement",
    title: "Votre paiement n'est pas passe",
    body: "Votre banque a refuse le prelevement de {amount}, votre acces est donc suspendu.",
    why: "Il s'agit presque toujours d'un refus des prelevements automatiques, pas d'un manque de fonds. En payant depuis le site, votre banque confirme immediatement et le paiement passe.",
    cta: "Reactiver mon abonnement",
    keep: "Vos documents restent enregistres dans votre compte.",
    bye: "Support EditorPDF",
  },
  de: {
    subject: "Wir konnten Ihr Abo nicht abbuchen",
    title: "Ihre Zahlung ist nicht durchgegangen",
    body: "Ihre Bank hat die Abbuchung von {amount} abgelehnt, daher ist Ihr Zugang pausiert.",
    why: "Fast immer lehnt die Bank automatische Abbuchungen ab — es fehlt nicht am Guthaben. Wenn Sie uber die Website zahlen, bestatigt Ihre Bank die Zahlung sofort und sie geht durch.",
    cta: "Abo reaktivieren",
    keep: "Ihre Dokumente bleiben in Ihrem Konto gespeichert.",
    bye: "EditorPDF Support",
  },
  pt: {
    subject: "Nao conseguimos cobrar a sua subscricao",
    title: "O seu pagamento nao passou",
    body: "O seu banco recusou a cobranca de {amount}, por isso o seu acesso esta em pausa.",
    why: "Quase sempre e o banco a recusar cobrancas automaticas, nao falta de saldo. Se pagar pelo site, o seu banco confirma na hora e passa.",
    cta: "Reativar a minha subscricao",
    keep: "Os seus documentos continuam guardados na sua conta.",
    bye: "Suporte EditorPDF",
  },
  it: {
    subject: "Non siamo riusciti ad addebitare l'abbonamento",
    title: "Il pagamento non e andato a buon fine",
    body: "La tua banca ha rifiutato l'addebito di {amount}, quindi il tuo accesso e in pausa.",
    why: "Quasi sempre e la banca che rifiuta gli addebiti automatici, non una mancanza di fondi. Pagando dal sito la tua banca conferma subito e l'operazione passa.",
    cta: "Riattiva l'abbonamento",
    keep: "I tuoi documenti restano salvati nel tuo account.",
    bye: "Supporto EditorPDF",
  },
  nl: {
    subject: "We konden je abonnement niet afschrijven",
    title: "Je betaling is niet gelukt",
    body: "Je bank heeft de afschrijving van {amount} geweigerd, daarom is je toegang gepauzeerd.",
    why: "Bijna altijd weigert de bank automatische afschrijvingen — het gaat niet om je saldo. Als je via de site betaalt, bevestigt je bank het direct en lukt het wel.",
    cta: "Abonnement heractiveren",
    keep: "Je documenten blijven opgeslagen in je account.",
    bye: "EditorPDF Support",
  },
  pl: {
    subject: "Nie udalo sie pobrac oplaty za subskrypcje",
    title: "Twoja platnosc nie przeszla",
    body: "Bank odrzucil obciazenie na {amount}, wiec Twoj dostep jest wstrzymany.",
    why: "Prawie zawsze to bank odrzuca automatyczne obciazenia, a nie brak srodkow. Placac przez strone, bank potwierdza transakcje od razu i przechodzi.",
    cta: "Reaktywuj subskrypcje",
    keep: "Twoje dokumenty nadal sa zapisane na koncie.",
    bye: "Wsparcie EditorPDF",
  },
  ru: {
    subject: "Не удалось списать оплату подписки",
    title: "Платёж не прошёл",
    body: "Банк отклонил списание {amount}, поэтому доступ приостановлен.",
    why: "Почти всегда банк отклоняет именно автоматические списания, а не отказывает из-за баланса. Если оплатить на сайте, банк подтверждает платёж сразу и он проходит.",
    cta: "Возобновить подписку",
    keep: "Ваши документы по-прежнему сохранены в аккаунте.",
    bye: "Поддержка EditorPDF",
  },
  uk: {
    subject: "Не вдалося списати оплату підписки",
    title: "Платіж не пройшов",
    body: "Банк відхилив списання {amount}, тому доступ призупинено.",
    why: "Майже завжди банк відхиляє саме автоматичні списання, а не через брак коштів. Якщо оплатити на сайті, банк підтверджує платіж одразу і він проходить.",
    cta: "Відновити підписку",
    keep: "Ваші документи залишаються у вашому акаунті.",
    bye: "Підтримка EditorPDF",
  },
  ro: {
    subject: "Nu am putut incasa abonamentul",
    title: "Plata nu a trecut",
    body: "Banca a refuzat debitarea de {amount}, asa ca accesul tau este suspendat.",
    why: "Aproape intotdeauna banca refuza debitarile automate, nu este vorba de fonduri. Daca platesti de pe site, banca confirma pe loc si plata trece.",
    cta: "Reactiveaza abonamentul",
    keep: "Documentele tale ramin salvate in cont.",
    bye: "Suport EditorPDF",
  },
  zh: {
    subject: "我们未能扣取您的订阅费用",
    title: "您的付款未成功",
    body: "银行拒绝了 {amount} 的扣款，因此您的访问已暂停。",
    why: "这几乎都是银行拒绝自动扣款，而不是余额不足。从网站付款时会经过银行即时验证，通常可以成功。",
    cta: "重新启用订阅",
    keep: "您的文件仍然保存在账户中。",
    bye: "EditorPDF 支持团队",
  },
};

export async function sendRenewalFailedEmail(opts: {
  to: string;
  lang?: string;
  /** Importe con moneda, ya formateado para ese cliente (p. ej. "29,95 €"). */
  amountFormatted: string;
  /** Enlace con auto-login firmado al panel de facturación. */
  payUrl: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend sin configurar: no se envía el aviso de impago");
    return false;
  }
  const lang = (opts.lang || "es").slice(0, 2);
  const s = IMPAGO_STRINGS[lang] ?? IMPAGO_STRINGS.en;
  const ink = "#0A0A0B";
  const accent = "#E63946";
  const cuerpo = s.body.replace("{amount}", `<strong>${opts.amountFormatted}</strong>`);

  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(10,10,11,0.08);">
      <tr><td style="background:${ink};padding:20px 28px;">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-.02em;">editorpdf<span style="color:${accent};">.net</span></p>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 12px;color:${ink};font-size:21px;font-weight:800;line-height:1.25;">${s.title}</h1>
        <p style="margin:0 0 14px;color:#3f3f46;font-size:15px;line-height:1.55;">${cuerpo}</p>
        <p style="margin:0 0 22px;color:#5A5A62;font-size:13.5px;line-height:1.55;">${s.why}</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:${accent};">
          <a href="${opts.payUrl}" style="display:inline-block;padding:14px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${s.cta}</a>
        </td></tr></table>
        <p style="margin:20px 0 0;color:#71717a;font-size:12.5px;">${s.keep}</p>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #f1f1f4;">
        <p style="margin:0;color:#a1a1aa;font-size:12px;">${s.bye} &middot; support@editorpdf.net</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [opts.to],
      replyTo: "support@editorpdf.net",
      subject: s.subject,
      html,
    });
    if (error) {
      console.error("[Email] aviso de impago, error de Resend:", error);
      return false;
    }
    console.log(`[Email] aviso de impago enviado a ${opts.to} (${lang})`);
    return true;
  } catch (err) {
    console.error("[Email] aviso de impago, excepción:", err);
    return false;
  }
}

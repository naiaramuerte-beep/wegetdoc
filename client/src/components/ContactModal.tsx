/* =============================================================
   EditorPDF — Contact modal
   Opens from navbar/footer/cancel-subscription. Multilingual.
   Sends a stable English-ish `reason` key so admin badges stay
   consistent regardless of the visitor's language; the UI shows
   the localized label only.
   ============================================================= */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, MessageSquare, Send, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LangCode } from "@/lib/i18n";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

// Stable reason values stored in the DB (in English). The user-visible
// label is translated per language below. Admin's `ReasonBadge`
// already detects these regardless of language thanks to its regex.
const REASON_KEYS = ["tech_support", "billing", "feature", "bug", "collab", "other"] as const;
type ReasonKey = (typeof REASON_KEYS)[number];

type ReasonLabels = Record<ReasonKey, string>;

interface Strings {
  title: string;
  subtitle: string;
  fieldName: string;
  fieldEmail: string;
  fieldNamePlaceholder: string;
  fieldEmailPlaceholder: string;
  fieldReason: string;
  fieldSubject: string;
  fieldSubjectPlaceholder: string;
  fieldMessage: string;
  fieldMessagePlaceholder: string;
  submit: string;
  submitting: string;
  cancel: string;
  close: string;
  requiredFields: string;
  successTitle: string;
  successBody: string;
  spamNotice: string;
  spamHeader: string;
  spamStep1: string;
  spamStep2: string;
  spamStep3: string;
  successToast: string;
  errorToast: string;
  reasons: ReasonLabels;
}

const STRINGS: Record<LangCode, Strings> = {
  es: {
    title: "Contacto", subtitle: "Te respondemos en menos de 24 horas",
    fieldName: "Nombre", fieldEmail: "Email",
    fieldNamePlaceholder: "Tu nombre", fieldEmailPlaceholder: "tu@email.com",
    fieldReason: "Motivo",
    fieldSubject: "Asunto", fieldSubjectPlaceholder: "¿En qué podemos ayudarte?",
    fieldMessage: "Mensaje", fieldMessagePlaceholder: "Describe tu consulta con el mayor detalle posible…",
    submit: "Enviar mensaje", submitting: "Enviando…", cancel: "Cancelar", close: "Cerrar",
    requiredFields: "Por favor, completa todos los campos obligatorios",
    successTitle: "¡Mensaje enviado!", successBody: "Hemos recibido tu mensaje y te responderemos lo antes posible en",
    spamNotice: "Es muy probable que nuestra respuesta llegue a tu carpeta de SPAM o Correo no deseado.",
    spamHeader: "🚨 IMPORTANTE — Revisa tu carpeta de SPAM",
    spamStep1: "Abre tu Spam / Correo no deseado dentro de 24 horas",
    spamStep2: "Marca el email como \"No es spam\" o \"Mover a Recibidos\"",
    spamStep3: "Añade support@editorpdf.net a tus contactos",
    successToast: "Mensaje enviado correctamente", errorToast: "Error al enviar el mensaje. Inténtalo de nuevo.",
    reasons: { tech_support: "Soporte técnico", billing: "Facturación", feature: "Solicitud de función", bug: "Informe de error", collab: "Colaboración", other: "Otro" },
  },
  en: {
    title: "Contact us", subtitle: "We reply within 24 hours",
    fieldName: "Name", fieldEmail: "Email",
    fieldNamePlaceholder: "Your name", fieldEmailPlaceholder: "you@email.com",
    fieldReason: "Reason",
    fieldSubject: "Subject", fieldSubjectPlaceholder: "How can we help?",
    fieldMessage: "Message", fieldMessagePlaceholder: "Describe your inquiry in as much detail as possible…",
    submit: "Send message", submitting: "Sending…", cancel: "Cancel", close: "Close",
    requiredFields: "Please fill in all required fields",
    successTitle: "Message sent!", successBody: "We've received your message and will reply as soon as possible at",
    spamNotice: "Our reply is very likely to land in your SPAM or Junk folder.",
    spamHeader: "🚨 IMPORTANT — Check your SPAM folder",
    spamStep1: "Open your Spam / Junk folder within 24 hours",
    spamStep2: "Mark the email as \"Not spam\" or \"Move to Inbox\"",
    spamStep3: "Add support@editorpdf.net to your contacts",
    successToast: "Message sent successfully", errorToast: "Failed to send. Please try again.",
    reasons: { tech_support: "Technical support", billing: "Billing", feature: "Feature request", bug: "Bug report", collab: "Partnership", other: "Other" },
  },
  fr: {
    title: "Contact", subtitle: "Nous répondons sous 24 heures",
    fieldName: "Nom", fieldEmail: "Email",
    fieldNamePlaceholder: "Votre nom", fieldEmailPlaceholder: "vous@email.com",
    fieldReason: "Motif",
    fieldSubject: "Sujet", fieldSubjectPlaceholder: "En quoi pouvons-nous vous aider ?",
    fieldMessage: "Message", fieldMessagePlaceholder: "Décrivez votre demande avec le plus de détails possible…",
    submit: "Envoyer le message", submitting: "Envoi en cours…", cancel: "Annuler", close: "Fermer",
    requiredFields: "Veuillez remplir tous les champs obligatoires",
    successTitle: "Message envoyé !", successBody: "Nous avons bien reçu votre message et vous répondrons dès que possible à",
    spamNotice: "Notre réponse risque fortement d'arriver dans votre dossier SPAM / Indésirables.",
    spamHeader: "🚨 IMPORTANT — Vérifiez votre dossier SPAM",
    spamStep1: "Ouvrez votre dossier Spam / Indésirables dans les 24 heures",
    spamStep2: "Marquez l'e-mail comme \"Non spam\" ou \"Déplacer vers Boîte de réception\"",
    spamStep3: "Ajoutez support@editorpdf.net à vos contacts",
    successToast: "Message envoyé avec succès", errorToast: "Échec de l'envoi. Veuillez réessayer.",
    reasons: { tech_support: "Support technique", billing: "Facturation", feature: "Demande de fonctionnalité", bug: "Signalement de bug", collab: "Partenariat", other: "Autre" },
  },
  de: {
    title: "Kontakt", subtitle: "Wir antworten innerhalb von 24 Stunden",
    fieldName: "Name", fieldEmail: "E-Mail",
    fieldNamePlaceholder: "Ihr Name", fieldEmailPlaceholder: "sie@email.de",
    fieldReason: "Grund",
    fieldSubject: "Betreff", fieldSubjectPlaceholder: "Wobei können wir helfen?",
    fieldMessage: "Nachricht", fieldMessagePlaceholder: "Beschreiben Sie Ihre Anfrage so detailliert wie möglich…",
    submit: "Nachricht senden", submitting: "Wird gesendet…", cancel: "Abbrechen", close: "Schließen",
    requiredFields: "Bitte füllen Sie alle Pflichtfelder aus",
    successTitle: "Nachricht gesendet!", successBody: "Wir haben Ihre Nachricht erhalten und antworten so bald wie möglich an",
    spamNotice: "Unsere Antwort landet sehr wahrscheinlich in Ihrem SPAM- bzw. Junk-Ordner.",
    spamHeader: "🚨 WICHTIG — Prüfen Sie Ihren SPAM-Ordner",
    spamStep1: "Öffnen Sie innerhalb von 24 Stunden Ihren Spam-/Junk-Ordner",
    spamStep2: "Markieren Sie die E-Mail als \"Kein Spam\" oder \"In Posteingang verschieben\"",
    spamStep3: "Fügen Sie support@editorpdf.net zu Ihren Kontakten hinzu",
    successToast: "Nachricht erfolgreich gesendet", errorToast: "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.",
    reasons: { tech_support: "Technischer Support", billing: "Abrechnung", feature: "Funktionswunsch", bug: "Fehlermeldung", collab: "Partnerschaft", other: "Sonstiges" },
  },
  pt: {
    title: "Contacto", subtitle: "Respondemos em menos de 24 horas",
    fieldName: "Nome", fieldEmail: "Email",
    fieldNamePlaceholder: "O seu nome", fieldEmailPlaceholder: "voce@email.com",
    fieldReason: "Motivo",
    fieldSubject: "Assunto", fieldSubjectPlaceholder: "Em que podemos ajudar?",
    fieldMessage: "Mensagem", fieldMessagePlaceholder: "Descreva a sua consulta com o máximo de detalhe possível…",
    submit: "Enviar mensagem", submitting: "A enviar…", cancel: "Cancelar", close: "Fechar",
    requiredFields: "Por favor, preencha todos os campos obrigatórios",
    successTitle: "Mensagem enviada!", successBody: "Recebemos a sua mensagem e responderemos o mais rapidamente possível para",
    spamNotice: "É muito provável que a nossa resposta vá para a sua pasta de SPAM / Lixo eletrónico.",
    spamHeader: "🚨 IMPORTANTE — Verifique a pasta de SPAM",
    spamStep1: "Abra a pasta de Spam / Lixo eletrónico nas próximas 24 horas",
    spamStep2: "Marque o email como \"Não é spam\" ou \"Mover para a Caixa de entrada\"",
    spamStep3: "Adicione support@editorpdf.net aos seus contactos",
    successToast: "Mensagem enviada com sucesso", errorToast: "Falha ao enviar. Tente novamente.",
    reasons: { tech_support: "Suporte técnico", billing: "Faturação", feature: "Pedido de funcionalidade", bug: "Reportar erro", collab: "Parceria", other: "Outro" },
  },
  it: {
    title: "Contatto", subtitle: "Rispondiamo entro 24 ore",
    fieldName: "Nome", fieldEmail: "Email",
    fieldNamePlaceholder: "Il tuo nome", fieldEmailPlaceholder: "tu@email.com",
    fieldReason: "Motivo",
    fieldSubject: "Oggetto", fieldSubjectPlaceholder: "Come possiamo aiutarti?",
    fieldMessage: "Messaggio", fieldMessagePlaceholder: "Descrivi la tua richiesta nel modo più dettagliato possibile…",
    submit: "Invia messaggio", submitting: "Invio in corso…", cancel: "Annulla", close: "Chiudi",
    requiredFields: "Compila tutti i campi obbligatori",
    successTitle: "Messaggio inviato!", successBody: "Abbiamo ricevuto il tuo messaggio e risponderemo al più presto a",
    spamNotice: "È molto probabile che la nostra risposta finisca nella tua cartella SPAM / Posta indesiderata.",
    spamHeader: "🚨 IMPORTANTE — Controlla la cartella SPAM",
    spamStep1: "Apri la cartella Spam / Posta indesiderata entro 24 ore",
    spamStep2: "Segna l'email come \"Non spam\" o \"Sposta nella Posta in arrivo\"",
    spamStep3: "Aggiungi support@editorpdf.net ai tuoi contatti",
    successToast: "Messaggio inviato con successo", errorToast: "Errore nell'invio. Riprova.",
    reasons: { tech_support: "Supporto tecnico", billing: "Fatturazione", feature: "Richiesta funzionalità", bug: "Segnalazione bug", collab: "Collaborazione", other: "Altro" },
  },
  nl: {
    title: "Contact", subtitle: "We reageren binnen 24 uur",
    fieldName: "Naam", fieldEmail: "E-mail",
    fieldNamePlaceholder: "Uw naam", fieldEmailPlaceholder: "jij@email.com",
    fieldReason: "Reden",
    fieldSubject: "Onderwerp", fieldSubjectPlaceholder: "Waarmee kunnen we helpen?",
    fieldMessage: "Bericht", fieldMessagePlaceholder: "Beschrijf uw vraag zo gedetailleerd mogelijk…",
    submit: "Bericht verzenden", submitting: "Bezig met verzenden…", cancel: "Annuleren", close: "Sluiten",
    requiredFields: "Vul alle verplichte velden in",
    successTitle: "Bericht verzonden!", successBody: "We hebben uw bericht ontvangen en zullen zo snel mogelijk reageren op",
    spamNotice: "Onze reactie komt zeer waarschijnlijk in uw SPAM- of Ongewenste post-map terecht.",
    spamHeader: "🚨 BELANGRIJK — Controleer uw SPAM-map",
    spamStep1: "Open binnen 24 uur uw Spam- of Ongewenste post-map",
    spamStep2: "Markeer het e-mailbericht als \"Geen spam\" of \"Verplaatsen naar Inbox\"",
    spamStep3: "Voeg support@editorpdf.net toe aan uw contacten",
    successToast: "Bericht succesvol verzonden", errorToast: "Verzenden mislukt. Probeer het opnieuw.",
    reasons: { tech_support: "Technische ondersteuning", billing: "Facturering", feature: "Functieverzoek", bug: "Bugmelding", collab: "Samenwerking", other: "Anders" },
  },
  pl: {
    title: "Kontakt", subtitle: "Odpowiadamy w ciągu 24 godzin",
    fieldName: "Imię", fieldEmail: "E-mail",
    fieldNamePlaceholder: "Twoje imię", fieldEmailPlaceholder: "ty@email.com",
    fieldReason: "Powód",
    fieldSubject: "Temat", fieldSubjectPlaceholder: "W czym możemy pomóc?",
    fieldMessage: "Wiadomość", fieldMessagePlaceholder: "Opisz swoje pytanie jak najdokładniej…",
    submit: "Wyślij wiadomość", submitting: "Wysyłanie…", cancel: "Anuluj", close: "Zamknij",
    requiredFields: "Wypełnij wszystkie wymagane pola",
    successTitle: "Wiadomość wysłana!", successBody: "Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe na",
    spamNotice: "Nasza odpowiedź najprawdopodobniej trafi do folderu SPAM lub Wiadomości-śmieci.",
    spamHeader: "🚨 WAŻNE — Sprawdź folder SPAM",
    spamStep1: "Otwórz folder Spam / Wiadomości-śmieci w ciągu 24 godzin",
    spamStep2: "Oznacz wiadomość jako \"To nie spam\" lub \"Przenieś do Odebranych\"",
    spamStep3: "Dodaj support@editorpdf.net do kontaktów",
    successToast: "Wiadomość wysłana pomyślnie", errorToast: "Wysyłanie nie powiodło się. Spróbuj ponownie.",
    reasons: { tech_support: "Pomoc techniczna", billing: "Płatności", feature: "Prośba o funkcję", bug: "Zgłoszenie błędu", collab: "Współpraca", other: "Inne" },
  },
  ru: {
    title: "Связаться с нами", subtitle: "Отвечаем в течение 24 часов",
    fieldName: "Имя", fieldEmail: "Email",
    fieldNamePlaceholder: "Ваше имя", fieldEmailPlaceholder: "вы@email.com",
    fieldReason: "Причина",
    fieldSubject: "Тема", fieldSubjectPlaceholder: "Чем мы можем помочь?",
    fieldMessage: "Сообщение", fieldMessagePlaceholder: "Опишите ваш запрос максимально подробно…",
    submit: "Отправить сообщение", submitting: "Отправка…", cancel: "Отмена", close: "Закрыть",
    requiredFields: "Пожалуйста, заполните все обязательные поля",
    successTitle: "Сообщение отправлено!", successBody: "Мы получили ваше сообщение и ответим как можно скорее на",
    spamNotice: "Наш ответ с большой вероятностью попадёт в папку СПАМ.",
    spamHeader: "🚨 ВАЖНО — Проверьте папку СПАМ",
    spamStep1: "Откройте папку Спам в течение 24 часов",
    spamStep2: "Отметьте письмо как «Не спам» или «Переместить во Входящие»",
    spamStep3: "Добавьте support@editorpdf.net в ваши контакты",
    successToast: "Сообщение успешно отправлено", errorToast: "Не удалось отправить. Попробуйте ещё раз.",
    reasons: { tech_support: "Техническая поддержка", billing: "Оплата", feature: "Запрос функции", bug: "Сообщение об ошибке", collab: "Сотрудничество", other: "Другое" },
  },
  uk: {
    title: "Зв'язатися з нами", subtitle: "Відповідаємо протягом 24 годин",
    fieldName: "Ім'я", fieldEmail: "Email",
    fieldNamePlaceholder: "Ваше ім'я", fieldEmailPlaceholder: "ви@email.com",
    fieldReason: "Причина",
    fieldSubject: "Тема", fieldSubjectPlaceholder: "Чим можемо допомогти?",
    fieldMessage: "Повідомлення", fieldMessagePlaceholder: "Опишіть свій запит якнайдетальніше…",
    submit: "Надіслати повідомлення", submitting: "Надсилання…", cancel: "Скасувати", close: "Закрити",
    requiredFields: "Будь ласка, заповніть усі обов'язкові поля",
    successTitle: "Повідомлення надіслано!", successBody: "Ми отримали ваше повідомлення та відповімо якнайшвидше на",
    spamNotice: "Наша відповідь з великою ймовірністю потрапить до теки СПАМ.",
    spamHeader: "🚨 ВАЖЛИВО — Перевірте теку СПАМ",
    spamStep1: "Відкрийте теку Спам протягом 24 годин",
    spamStep2: "Позначте лист як «Не спам» або «Перемістити до Вхідних»",
    spamStep3: "Додайте support@editorpdf.net до своїх контактів",
    successToast: "Повідомлення надіслано успішно", errorToast: "Не вдалося надіслати. Спробуйте ще раз.",
    reasons: { tech_support: "Технічна підтримка", billing: "Оплата", feature: "Запит функції", bug: "Звіт про помилку", collab: "Співпраця", other: "Інше" },
  },
  ro: {
    title: "Contact", subtitle: "Răspundem în mai puțin de 24 de ore",
    fieldName: "Nume", fieldEmail: "Email",
    fieldNamePlaceholder: "Numele tău", fieldEmailPlaceholder: "tu@email.com",
    fieldReason: "Motiv",
    fieldSubject: "Subiect", fieldSubjectPlaceholder: "Cu ce vă putem ajuta?",
    fieldMessage: "Mesaj", fieldMessagePlaceholder: "Descrieți solicitarea dvs. cât mai detaliat posibil…",
    submit: "Trimite mesajul", submitting: "Se trimite…", cancel: "Anulează", close: "Închide",
    requiredFields: "Vă rugăm să completați toate câmpurile obligatorii",
    successTitle: "Mesaj trimis!", successBody: "Am primit mesajul tău și îți vom răspunde cât mai curând la",
    spamNotice: "Răspunsul nostru va ajunge cel mai probabil în folderul SPAM.",
    spamHeader: "🚨 IMPORTANT — Verifică folderul SPAM",
    spamStep1: "Deschide folderul Spam în următoarele 24 de ore",
    spamStep2: "Marchează e-mailul ca \"Nu este spam\" sau \"Mută în Inbox\"",
    spamStep3: "Adaugă support@editorpdf.net la contactele tale",
    successToast: "Mesaj trimis cu succes", errorToast: "Trimiterea a eșuat. Încearcă din nou.",
    reasons: { tech_support: "Asistență tehnică", billing: "Facturare", feature: "Cerere de funcționalitate", bug: "Raport de eroare", collab: "Parteneriat", other: "Altul" },
  },
  zh: {
    title: "联系我们", subtitle: "我们将在 24 小时内回复",
    fieldName: "姓名", fieldEmail: "邮箱",
    fieldNamePlaceholder: "您的姓名", fieldEmailPlaceholder: "you@email.com",
    fieldReason: "原因",
    fieldSubject: "主题", fieldSubjectPlaceholder: "我们能为您提供什么帮助？",
    fieldMessage: "留言", fieldMessagePlaceholder: "请尽可能详细地描述您的问题…",
    submit: "发送留言", submitting: "发送中…", cancel: "取消", close: "关闭",
    requiredFields: "请填写所有必填字段",
    successTitle: "留言已发送！", successBody: "我们已收到您的留言，将尽快回复至",
    spamNotice: "我们的回复很可能会进入您的垃圾邮件文件夹。",
    spamHeader: "🚨 重要 — 请查看您的垃圾邮件文件夹",
    spamStep1: "在 24 小时内打开您的垃圾邮件文件夹",
    spamStep2: "将邮件标记为\"非垃圾邮件\"或\"移至收件箱\"",
    spamStep3: "将 support@editorpdf.net 添加到您的联系人",
    successToast: "留言发送成功", errorToast: "发送失败，请重试。",
    reasons: { tech_support: "技术支持", billing: "账单", feature: "功能请求", bug: "错误报告", collab: "合作", other: "其他" },
  },
};

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const s = STRINGS[lang] ?? STRINGS.es;

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    reason: "" as ReasonKey | "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success(s.successToast);
    },
    onError: () => toast.error(s.errorToast),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error(s.requiredFields);
      return;
    }
    // Submit the stable English-ish reason key (or empty string) so admin
    // sees consistent values regardless of language.
    sendMutation.mutate({ ...form, reason: form.reason || "" });
  };

  const handleClose = () => {
    setSent(false);
    setForm({ name: user?.name ?? "", email: user?.email ?? "", reason: "", subject: "", message: "" });
    onClose();
  };

  if (!open) return null;

  const ink = "#0A0A0B";
  const accent = "#E63946";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ backgroundColor: ink }}>
              <MessageSquare size={18} className="text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white" style={{ backgroundColor: accent }} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{s.title}</h2>
              <p className="text-xs text-slate-500">{s.subtitle}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(230,57,70,0.10)" }}>
              <Check size={28} style={{ color: accent }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{s.successTitle}</h3>
            <p className="text-slate-500 mb-4">
              {s.successBody} <strong>{form.email}</strong>.
            </p>
            <div
              className="rounded-xl p-4 mb-6 text-left border-2"
              style={{ backgroundColor: "#FEF2F2", borderColor: "#E63946" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#B91C1C" }}>
                {s.spamHeader}
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "#991B1B" }}>
                {s.spamNotice}
              </p>
              <ol className="space-y-1.5 text-sm leading-snug" style={{ color: "#7F1D1D" }}>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0" style={{ color: "#E63946" }}>1.</span>
                  <span>{s.spamStep1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0" style={{ color: "#E63946" }}>2.</span>
                  <span>{s.spamStep2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0" style={{ color: "#E63946" }}>3.</span>
                  <span>{s.spamStep3}</span>
                </li>
              </ol>
            </div>
            <Button onClick={handleClose} className="text-white px-8" style={{ backgroundColor: ink }}>
              {s.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-700 mb-1.5 block">{s.fieldName} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={s.fieldNamePlaceholder}
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-slate-700 mb-1.5 block">{s.fieldEmail} *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={s.fieldEmailPlaceholder}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-1.5 block">{s.fieldReason}</Label>
              <div className="flex flex-wrap gap-2">
                {REASON_KEYS.map((k) => {
                  const active = form.reason === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, reason: k })}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: active ? ink : "transparent",
                        color: active ? "#ffffff" : "#475569",
                        borderColor: active ? ink : "#e2e8f0",
                      }}
                    >
                      {s.reasons[k]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-1.5 block">{s.fieldSubject} *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={s.fieldSubjectPlaceholder}
                required
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-1.5 block">{s.fieldMessage} *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={s.fieldMessagePlaceholder}
                rows={4}
                required
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={sendMutation.isPending}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                {sendMutation.isPending ? (
                  s.submitting
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {s.submit}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                {s.cancel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

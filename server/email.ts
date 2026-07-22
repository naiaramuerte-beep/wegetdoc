/* =============================================================
   EditorPDF Email Service — Resend integration
   Sends transactional emails for payment confirmation, etc.
   ============================================================= */

import { Resend } from "resend";
import { brandName } from "./brand";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// All transactional mail goes from support@editorpdf.net so users can
// just reply and the message lands in the support inbox (Cloudflare
// Email Routing forwards support@ → the gmail behind it). One unified
// From keeps deliverability + reputation under a single address.
const FROM_ADDRESS = `${brandName} <support@editorpdf.net>`;
const FROM_ADDRESS_VERIFIED = FROM_ADDRESS;
const REPLY_TO_ADDRESS = "support@editorpdf.net";

// Common headers added to every transactional email. They tell Gmail/Outlook
// "this is a legitimate automated message, not spam":
//   - Auto-Submitted: auto-generated  → RFC 3834 transactional signal
//   - Precedence: bulk               → some filters ignore but harmless
//   - X-Entity-Ref-ID: <id>          → opt for spam-classifier reset on bounces
// Resend doesn't expose every standard header, but these three pass through.
const TRANSACTIONAL_HEADERS = {
  "Auto-Submitted": "auto-generated",
  "Precedence": "bulk",
  "X-Auto-Response-Suppress": "All",
};

/** Strip HTML to a passable plain-text alternative. Helps deliverability —
 * mail servers penalise HTML-only messages. Keeps line breaks for `<br>`,
 * `<p>`, `<tr>` and lists; everything else is collapsed to a single space. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|tr|li|h\d|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Welcome email sent right after the user pays the €0.50 trial. Mostly
 * product onboarding — what EditorPDF can do, where to start. The trial
 * disclaimer (auto-renew warning + cancel link) is at the bottom in
 * small low-contrast text on purpose: legal protection without scaring
 * the user away from the activation moment.
 *
 * Multilingual via STRINGS map; falls back to English when an unknown
 * lang code is passed.
 */
type WelcomeStrings = {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  ctaButton: string;
  sectionEditTitle: string;
  sectionEdit: string[];
  sectionConvertTitle: string;
  sectionConvert: string[];
  sectionOrganizeTitle: string;
  sectionOrganize: string[];
  sectionProtectTitle: string;
  sectionProtect: string[];
  helpLine: string;
  helpReply: string;
  signoff: string;
  disclaimer: (trialEndDate: string, cancelUrl: string, price: string) => string;
  manageBtn: string;
};

const WELCOME_STRINGS: Record<string, WelcomeStrings> = {
  es: {
    subject: `¡Bienvenido a ${brandName}! Aquí tienes todo lo que puedes hacer`,
    greeting: (n) => `Hola ${n},`,
    intro: `Gracias por unirte. Tu cuenta está activa y ya puedes usar todas las funciones premium ahora mismo.`,
    ctaButton: "Empezar a editar",
    sectionEditTitle: "✏️ Edita PDFs sin convertir a Word",
    sectionEdit: [
      "Modifica texto manteniendo la fuente y el formato original",
      "Añade firmas digitales o dibujadas a mano",
      "Subraya, comenta, dibuja flechas o formas",
      "Inserta imágenes, sellos o logos",
    ],
    sectionConvertTitle: "🔄 Convierte entre formatos",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Conserva tablas, fuentes y disposición",
    ],
    sectionOrganizeTitle: "📦 Organiza tus documentos",
    sectionOrganize: [
      "Une varios PDFs en uno solo",
      "Divide PDFs en partes",
      "Reordena, rota o elimina páginas",
      "Comprime para reducir el tamaño",
    ],
    sectionProtectTitle: "🔒 Protege la información sensible",
    sectionProtect: [
      "Añade contraseña a tus PDFs",
      "Encripta documentos con datos personales",
    ],
    helpLine: "¿Necesitas ayuda?",
    helpReply: "Responde a este email — te respondemos en menos de 24 horas.",
    signoff: "Un saludo,\nEquipo EditorPDF",
    manageBtn: "Gestionar suscripción",
    disclaimer: (date, url, price) =>
      `Has activado un período de prueba de 48 horas por 0,50€. Si no cancelas antes del ${date}, tu suscripción se renovará automáticamente al plan mensual de ${price}/mes. Puedes cancelar en cualquier momento desde tu panel de Facturación: ${url}`,
  },
  en: {
    subject: `Welcome to ${brandName}! Here's everything you can do`,
    greeting: (n) => `Hi ${n},`,
    intro: `Thanks for joining. Your account is now active and all premium features are available right now.`,
    ctaButton: "Start editing",
    sectionEditTitle: "✏️ Edit PDFs without converting to Word",
    sectionEdit: [
      "Modify text while preserving the original font and layout",
      "Add digital or hand-drawn signatures",
      "Highlight, comment, draw arrows or shapes",
      "Insert images, stamps or logos",
    ],
    sectionConvertTitle: "🔄 Convert between formats",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tables, fonts and layout preserved",
    ],
    sectionOrganizeTitle: "📦 Organise your documents",
    sectionOrganize: [
      "Merge several PDFs into one",
      "Split PDFs into parts",
      "Reorder, rotate or delete pages",
      "Compress to reduce file size",
    ],
    sectionProtectTitle: "🔒 Protect sensitive data",
    sectionProtect: [
      "Add a password to your PDFs",
      "Encrypt documents with personal information",
    ],
    helpLine: "Need help?",
    helpReply: "Just reply to this email — we respond within 24 hours.",
    signoff: "Best regards,\nEditorPDF Team",
    manageBtn: "Manage subscription",
    disclaimer: (date, url, price) =>
      `You've activated a 48-hour trial for €0.50. If you don't cancel before ${date}, your subscription will automatically renew at the monthly plan of ${price}/month. You can cancel anytime from your Billing dashboard: ${url}`,
  },
  fr: {
    subject: `Bienvenue chez ${brandName} ! Voici tout ce que vous pouvez faire`,
    greeting: (n) => `Bonjour ${n},`,
    intro: `Merci de nous rejoindre. Votre compte est actif et toutes les fonctionnalités premium sont disponibles dès maintenant.`,
    ctaButton: "Commencer à éditer",
    sectionEditTitle: "✏️ Éditez vos PDF sans convertir en Word",
    sectionEdit: [
      "Modifiez le texte en conservant la police et la mise en page",
      "Ajoutez des signatures numériques ou dessinées à la main",
      "Surlignez, commentez, dessinez des flèches ou des formes",
      "Insérez images, tampons ou logos",
    ],
    sectionConvertTitle: "🔄 Convertissez entre formats",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tableaux, polices et mise en page préservés",
    ],
    sectionOrganizeTitle: "📦 Organisez vos documents",
    sectionOrganize: [
      "Fusionnez plusieurs PDF en un seul",
      "Divisez les PDF en plusieurs parties",
      "Réorganisez, faites pivoter ou supprimez des pages",
      "Compressez pour réduire la taille",
    ],
    sectionProtectTitle: "🔒 Protégez les données sensibles",
    sectionProtect: [
      "Ajoutez un mot de passe à vos PDF",
      "Chiffrez les documents contenant des informations personnelles",
    ],
    helpLine: "Besoin d'aide ?",
    helpReply: "Répondez simplement à cet email — réponse sous 24 heures.",
    signoff: "Cordialement,\nL'équipe EditorPDF",
    manageBtn: "Gérer l'abonnement",
    disclaimer: (date, url, price) =>
      `Vous avez activé une période d'essai de 48 heures pour 0,50€. Si vous n'annulez pas avant le ${date}, votre abonnement sera automatiquement renouvelé au tarif mensuel de ${price}/mois. Vous pouvez annuler à tout moment depuis votre tableau de Facturation : ${url}`,
  },
  de: {
    subject: `Willkommen bei ${brandName}! Hier ist alles, was Sie tun können`,
    greeting: (n) => `Hallo ${n},`,
    intro: `Danke, dass Sie dabei sind. Ihr Konto ist jetzt aktiv und alle Premium-Funktionen sind sofort verfügbar.`,
    ctaButton: "Jetzt bearbeiten",
    sectionEditTitle: "✏️ PDFs bearbeiten ohne Word-Konvertierung",
    sectionEdit: [
      "Text bearbeiten unter Beibehaltung von Schriftart und Layout",
      "Digitale oder handgezeichnete Unterschriften hinzufügen",
      "Markieren, kommentieren, Pfeile oder Formen zeichnen",
      "Bilder, Stempel oder Logos einfügen",
    ],
    sectionConvertTitle: "🔄 Zwischen Formaten konvertieren",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabellen, Schriften und Layout bleiben erhalten",
    ],
    sectionOrganizeTitle: "📦 Dokumente organisieren",
    sectionOrganize: [
      "Mehrere PDFs zu einem zusammenführen",
      "PDFs in Teile aufteilen",
      "Seiten neu anordnen, drehen oder löschen",
      "Komprimieren zur Größenreduzierung",
    ],
    sectionProtectTitle: "🔒 Sensible Daten schützen",
    sectionProtect: [
      "Passwort zu PDFs hinzufügen",
      "Dokumente mit persönlichen Daten verschlüsseln",
    ],
    helpLine: "Brauchen Sie Hilfe?",
    helpReply: "Antworten Sie einfach auf diese E-Mail — Antwort innerhalb von 24 Stunden.",
    signoff: "Mit freundlichen Grüßen,\nDas EditorPDF-Team",
    manageBtn: "Abonnement verwalten",
    disclaimer: (date, url, price) =>
      `Sie haben eine 48-Stunden-Testphase für 0,50€ aktiviert. Wenn Sie nicht vor dem ${date} kündigen, wird Ihr Abonnement automatisch zum Monatsplan von ${price}/Monat verlängert. Sie können jederzeit über Ihr Abrechnungs-Dashboard kündigen: ${url}`,
  },
  pt: {
    subject: `Bem-vindo ao ${brandName}! Aqui está tudo o que pode fazer`,
    greeting: (n) => `Olá ${n},`,
    intro: `Obrigado por se juntar a nós. A sua conta está ativa e todas as funções premium estão disponíveis agora mesmo.`,
    ctaButton: "Começar a editar",
    sectionEditTitle: "✏️ Edite PDFs sem converter para Word",
    sectionEdit: [
      "Modifique o texto preservando a fonte e o layout",
      "Adicione assinaturas digitais ou desenhadas à mão",
      "Destaque, comente, desenhe setas ou formas",
      "Insira imagens, carimbos ou logótipos",
    ],
    sectionConvertTitle: "🔄 Converta entre formatos",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabelas, fontes e layout preservados",
    ],
    sectionOrganizeTitle: "📦 Organize os seus documentos",
    sectionOrganize: [
      "Junte vários PDFs num só",
      "Divida PDFs em partes",
      "Reordene, rode ou elimine páginas",
      "Comprima para reduzir o tamanho",
    ],
    sectionProtectTitle: "🔒 Proteja informações sensíveis",
    sectionProtect: [
      "Adicione palavra-passe aos seus PDFs",
      "Encripte documentos com dados pessoais",
    ],
    helpLine: "Precisa de ajuda?",
    helpReply: "Basta responder a este email — respondemos em menos de 24 horas.",
    signoff: "Com os melhores cumprimentos,\nEquipa EditorPDF",
    manageBtn: "Gerir subscrição",
    disclaimer: (date, url, price) =>
      `Ativou um período de teste de 48 horas por 0,50€. Se não cancelar antes de ${date}, a sua subscrição será renovada automaticamente para o plano mensal de ${price}/mês. Pode cancelar a qualquer momento no seu painel de Faturação: ${url}`,
  },
  it: {
    subject: `Benvenuto in ${brandName}! Ecco tutto quello che puoi fare`,
    greeting: (n) => `Ciao ${n},`,
    intro: `Grazie per esserti unito a noi. Il tuo account è attivo e tutte le funzionalità premium sono disponibili da subito.`,
    ctaButton: "Inizia a modificare",
    sectionEditTitle: "✏️ Modifica i PDF senza convertirli in Word",
    sectionEdit: [
      "Modifica il testo mantenendo font e layout originali",
      "Aggiungi firme digitali o disegnate a mano",
      "Evidenzia, commenta, disegna frecce o forme",
      "Inserisci immagini, timbri o loghi",
    ],
    sectionConvertTitle: "🔄 Converti tra formati",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabelle, font e impaginazione preservati",
    ],
    sectionOrganizeTitle: "📦 Organizza i tuoi documenti",
    sectionOrganize: [
      "Unisci più PDF in uno solo",
      "Dividi i PDF in parti",
      "Riordina, ruota o elimina pagine",
      "Comprimi per ridurre le dimensioni",
    ],
    sectionProtectTitle: "🔒 Proteggi dati sensibili",
    sectionProtect: [
      "Aggiungi una password ai tuoi PDF",
      "Cripta documenti con dati personali",
    ],
    helpLine: "Hai bisogno di aiuto?",
    helpReply: "Rispondi a questa email — ti rispondiamo entro 24 ore.",
    signoff: "Cordiali saluti,\nIl team EditorPDF",
    manageBtn: "Gestisci abbonamento",
    disclaimer: (date, url, price) =>
      `Hai attivato un periodo di prova di 48 ore per 0,50€. Se non annulli prima del ${date}, il tuo abbonamento si rinnoverà automaticamente al piano mensile di ${price}/mese. Puoi annullare in qualsiasi momento dalla dashboard Fatturazione: ${url}`,
  },
  nl: {
    subject: `Welkom bij ${brandName}! Hier is alles wat u kunt doen`,
    greeting: (n) => `Hallo ${n},`,
    intro: `Bedankt dat u zich heeft aangemeld. Uw account is actief en alle premium-functies zijn meteen beschikbaar.`,
    ctaButton: "Begin met bewerken",
    sectionEditTitle: "✏️ PDFs bewerken zonder naar Word te converteren",
    sectionEdit: [
      "Tekst aanpassen met behoud van originele lettertype en lay-out",
      "Digitale of handgetekende handtekeningen toevoegen",
      "Markeren, becommentariëren, pijlen of vormen tekenen",
      "Afbeeldingen, stempels of logo's invoegen",
    ],
    sectionConvertTitle: "🔄 Converteer tussen formaten",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabellen, lettertypen en lay-out behouden",
    ],
    sectionOrganizeTitle: "📦 Organiseer uw documenten",
    sectionOrganize: [
      "Voeg meerdere PDFs samen tot één",
      "Splits PDFs in delen",
      "Pagina's herschikken, roteren of verwijderen",
      "Comprimeer om bestandsgrootte te verkleinen",
    ],
    sectionProtectTitle: "🔒 Bescherm gevoelige gegevens",
    sectionProtect: [
      "Voeg een wachtwoord toe aan uw PDFs",
      "Versleutel documenten met persoonlijke gegevens",
    ],
    helpLine: "Hulp nodig?",
    helpReply: "Reageer gewoon op deze e-mail — antwoord binnen 24 uur.",
    signoff: "Met vriendelijke groet,\nHet EditorPDF-team",
    manageBtn: "Abonnement beheren",
    disclaimer: (date, url, price) =>
      `U heeft een proefperiode van 48 uur geactiveerd voor €0,50. Als u niet voor ${date} opzegt, wordt uw abonnement automatisch verlengd naar het maandabonnement van ${price}/maand. U kunt op elk moment opzeggen via uw Facturering-dashboard: ${url}`,
  },
  pl: {
    subject: `Witaj w ${brandName}! Oto co możesz zrobić`,
    greeting: (n) => `Cześć ${n},`,
    intro: `Dziękujemy za dołączenie. Twoje konto jest aktywne i wszystkie funkcje premium są dostępne od zaraz.`,
    ctaButton: "Zacznij edytować",
    sectionEditTitle: "✏️ Edytuj PDFy bez konwersji do Word",
    sectionEdit: [
      "Modyfikuj tekst z zachowaniem oryginalnej czcionki i układu",
      "Dodaj cyfrowe lub odręczne podpisy",
      "Podkreślaj, komentuj, rysuj strzałki lub kształty",
      "Wstawiaj obrazy, pieczątki lub logo",
    ],
    sectionConvertTitle: "🔄 Konwertuj między formatami",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabele, czcionki i układ zachowane",
    ],
    sectionOrganizeTitle: "📦 Organizuj dokumenty",
    sectionOrganize: [
      "Połącz kilka PDFów w jeden",
      "Podziel PDFy na części",
      "Zmień kolejność, obróć lub usuń strony",
      "Kompresuj, aby zmniejszyć rozmiar",
    ],
    sectionProtectTitle: "🔒 Chroń wrażliwe dane",
    sectionProtect: [
      "Dodaj hasło do swoich PDFów",
      "Szyfruj dokumenty z danymi osobowymi",
    ],
    helpLine: "Potrzebujesz pomocy?",
    helpReply: "Po prostu odpowiedz na tę wiadomość — odpowiadamy w mniej niż 24 godziny.",
    signoff: "Pozdrawiamy,\nZespół EditorPDF",
    manageBtn: "Zarządzaj subskrypcją",
    disclaimer: (date, url, price) =>
      `Aktywowałeś 48-godzinny okres próbny za 0,50€. Jeśli nie anulujesz przed ${date}, Twoja subskrypcja zostanie automatycznie odnowiona w planie miesięcznym za ${price}/mies. Możesz anulować w dowolnym momencie z panelu Płatności: ${url}`,
  },
  ru: {
    subject: `Добро пожаловать в ${brandName}! Вот что вы можете делать`,
    greeting: (n) => `Здравствуйте, ${n}!`,
    intro: `Спасибо, что присоединились. Ваш аккаунт активен, и все премиум-функции доступны прямо сейчас.`,
    ctaButton: "Начать редактирование",
    sectionEditTitle: "✏️ Редактируйте PDF без конвертации в Word",
    sectionEdit: [
      "Изменяйте текст, сохраняя оригинальный шрифт и оформление",
      "Добавляйте цифровые или нарисованные от руки подписи",
      "Выделяйте, комментируйте, рисуйте стрелки и фигуры",
      "Вставляйте изображения, штампы или логотипы",
    ],
    sectionConvertTitle: "🔄 Конвертация между форматами",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Таблицы, шрифты и оформление сохраняются",
    ],
    sectionOrganizeTitle: "📦 Организуйте документы",
    sectionOrganize: [
      "Объединяйте несколько PDF в один",
      "Разделяйте PDF на части",
      "Переупорядочивайте, поворачивайте или удаляйте страницы",
      "Сжимайте для уменьшения размера",
    ],
    sectionProtectTitle: "🔒 Защитите конфиденциальные данные",
    sectionProtect: [
      "Добавляйте пароль к PDF",
      "Шифруйте документы с персональными данными",
    ],
    helpLine: "Нужна помощь?",
    helpReply: "Просто ответьте на это письмо — мы отвечаем менее чем за 24 часа.",
    signoff: "С уважением,\nКоманда EditorPDF",
    manageBtn: "Управление подпиской",
    disclaimer: (date, url, price) =>
      `Вы активировали 48-часовой пробный период за 0,50€. Если вы не отмените до ${date}, ваша подписка автоматически продлится на месячный план ${price}/мес. Вы можете отменить в любое время в панели Оплаты: ${url}`,
  },
  uk: {
    subject: `Ласкаво просимо до ${brandName}! Ось що ви можете робити`,
    greeting: (n) => `Вітаємо, ${n}!`,
    intro: `Дякуємо, що приєдналися. Ваш обліковий запис активний, і всі преміум-функції доступні просто зараз.`,
    ctaButton: "Почати редагування",
    sectionEditTitle: "✏️ Редагуйте PDF без конвертації в Word",
    sectionEdit: [
      "Змінюйте текст, зберігаючи оригінальний шрифт і оформлення",
      "Додавайте цифрові або намальовані підписи",
      "Виділяйте, коментуйте, малюйте стрілки або форми",
      "Вставляйте зображення, штампи або логотипи",
    ],
    sectionConvertTitle: "🔄 Конвертуйте між форматами",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Таблиці, шрифти та оформлення збережені",
    ],
    sectionOrganizeTitle: "📦 Організуйте документи",
    sectionOrganize: [
      "Об'єднуйте кілька PDF в один",
      "Розділяйте PDF на частини",
      "Перевпорядковуйте, обертайте або видаляйте сторінки",
      "Стискайте для зменшення розміру",
    ],
    sectionProtectTitle: "🔒 Захистіть конфіденційні дані",
    sectionProtect: [
      "Додавайте пароль до PDF",
      "Шифруйте документи з персональними даними",
    ],
    helpLine: "Потрібна допомога?",
    helpReply: "Просто дайте відповідь на цей лист — ми відповідаємо менш ніж за 24 години.",
    signoff: "З повагою,\nКоманда EditorPDF",
    manageBtn: "Керування підпискою",
    disclaimer: (date, url, price) =>
      `Ви активували 48-годинний пробний період за 0,50€. Якщо ви не скасуєте до ${date}, ваша підписка автоматично подовжиться на місячний план ${price}/міс. Ви можете скасувати будь-коли в панелі Оплати: ${url}`,
  },
  ro: {
    subject: `Bun venit la ${brandName}! Iată tot ce poți face`,
    greeting: (n) => `Bună ${n},`,
    intro: `Mulțumim că te-ai alăturat. Contul tău este activ și toate funcțiile premium sunt disponibile chiar acum.`,
    ctaButton: "Începe să editezi",
    sectionEditTitle: "✏️ Editează PDF-uri fără a le converti în Word",
    sectionEdit: [
      "Modifică textul păstrând fontul și aspectul original",
      "Adaugă semnături digitale sau desenate de mână",
      "Evidențiază, comentează, desenează săgeți sau forme",
      "Inserează imagini, ștampile sau logo-uri",
    ],
    sectionConvertTitle: "🔄 Convertește între formate",
    sectionConvert: [
      "PDF → Word, Excel, PowerPoint, JPG",
      "Word, Excel, PowerPoint, JPG → PDF",
      "Tabelele, fonturile și aspectul sunt păstrate",
    ],
    sectionOrganizeTitle: "📦 Organizează-ți documentele",
    sectionOrganize: [
      "Unește mai multe PDF-uri într-unul singur",
      "Împarte PDF-uri în părți",
      "Reordonează, rotește sau șterge pagini",
      "Comprimă pentru a reduce dimensiunea",
    ],
    sectionProtectTitle: "🔒 Protejează datele sensibile",
    sectionProtect: [
      "Adaugă o parolă la PDF-urile tale",
      "Criptează documente cu date personale",
    ],
    helpLine: "Ai nevoie de ajutor?",
    helpReply: "Răspunde la acest e-mail — îți răspundem în mai puțin de 24 de ore.",
    signoff: "Cu stimă,\nEchipa EditorPDF",
    manageBtn: "Gestionează abonamentul",
    disclaimer: (date, url, price) =>
      `Ai activat o perioadă de probă de 48 de ore pentru 0,50€. Dacă nu anulezi înainte de ${date}, abonamentul se va reînnoi automat la planul lunar de ${price}/lună. Poți anula oricând din panoul Facturare: ${url}`,
  },
  zh: {
    subject: `欢迎使用 ${brandName}！这是您可以做的一切`,
    greeting: (n) => `您好 ${n}，`,
    intro: `感谢您的加入。您的账户已激活，所有高级功能现在都可以使用。`,
    ctaButton: "开始编辑",
    sectionEditTitle: "✏️ 编辑 PDF 无需转换为 Word",
    sectionEdit: [
      "修改文本同时保留原始字体和布局",
      "添加数字或手绘签名",
      "突出显示、评论、绘制箭头或形状",
      "插入图像、图章或徽标",
    ],
    sectionConvertTitle: "🔄 在格式之间转换",
    sectionConvert: [
      "PDF → Word、Excel、PowerPoint、JPG",
      "Word、Excel、PowerPoint、JPG → PDF",
      "保留表格、字体和布局",
    ],
    sectionOrganizeTitle: "📦 整理您的文档",
    sectionOrganize: [
      "将多个 PDF 合并为一个",
      "将 PDF 分割成多部分",
      "重新排序、旋转或删除页面",
      "压缩以减小文件大小",
    ],
    sectionProtectTitle: "🔒 保护敏感信息",
    sectionProtect: [
      "为您的 PDF 添加密码",
      "加密包含个人信息的文档",
    ],
    helpLine: "需要帮助？",
    helpReply: "直接回复此邮件——我们将在 24 小时内回复您。",
    signoff: "此致敬礼，\nEditorPDF 团队",
    manageBtn: "管理订阅",
    disclaimer: (date, url, price) =>
      `您已激活 48 小时试用期，费用为 0.50€。如果您未在 ${date} 之前取消，您的订阅将自动续订为月度计划 ${price}/月。您可以随时从账单面板取消：${url}`,
  },
};

/**
 * Send the trial-welcome email. `lang` defaults to "es" when not provided
 * or unknown. `trialEndDate` is rendered locally per-language.
 */
export async function sendTrialWelcomeEmail({
  to,
  name,
  trialEndDate,
  lang = "es",
}: {
  to: string;
  name: string;
  trialEndDate: Date;
  lang?: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping welcome email");
    return false;
  }

  const langCode = (WELCOME_STRINGS[lang] ? lang : "es");
  const s = WELCOME_STRINGS[langCode];
  // Locale-aware date format. Falls back to default if Intl can't handle the lang.
  const localeMap: Record<string, string> = {
    es: "es-ES", en: "en-GB", fr: "fr-FR", de: "de-DE", pt: "pt-PT",
    it: "it-IT", nl: "nl-NL", pl: "pl-PL", ru: "ru-RU", uk: "uk-UA",
    ro: "ro-RO", zh: "zh-CN",
  };
  const formattedDate = trialEndDate.toLocaleDateString(localeMap[langCode] ?? "es-ES", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const editorUrl = `https://editorpdf.net/${langCode}/`;
  const cancelUrl = `https://editorpdf.net/${langCode}/dashboard?tab=billing`;
  // Live monthly price so the auto-renew disclaimer states the exact amount
  // the customer will be charged (anti-chargeback transparency).
  const { getActiveMonthlyPrice } = await import("./db");
  const priceFormatted = (await getActiveMonthlyPrice()).formatted;

  const ink = "#0A0A0B";
  const accent = "#E63946";
  const muted = "#94a3b8";

  const renderList = (items: string[]) => items.map((it) =>
    `<li style="margin:6px 0;color:#475569;font-size:14px;line-height:1.6;">${it}</li>`
  ).join("");

  const html = `
<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${s.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Brand header -->
        <tr><td style="background:${ink};padding:32px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
            Editor<span style="color:${accent};">PDF</span>
          </span>
        </td></tr>

        <!-- Greeting + intro -->
        <tr><td style="padding:36px 40px 8px;">
          <h1 style="margin:0 0 12px;font-size:24px;color:${ink};font-weight:800;letter-spacing:-0.3px;">
            ${s.greeting(name)}
          </h1>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            ${s.intro}
          </p>

          <!-- Hero CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 36px;"><tr><td>
            <a href="${editorUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
              ${s.ctaButton} →
            </a>
          </td></tr></table>
        </td></tr>

        <!-- Edit -->
        <tr><td style="padding:0 40px;">
          <h2 style="margin:0 0 8px;font-size:17px;color:${ink};font-weight:700;">
            ${s.sectionEditTitle}
          </h2>
          <ul style="margin:0 0 24px;padding-left:20px;">
            ${renderList(s.sectionEdit)}
          </ul>
        </td></tr>

        <!-- Convert -->
        <tr><td style="padding:0 40px;">
          <h2 style="margin:0 0 8px;font-size:17px;color:${ink};font-weight:700;">
            ${s.sectionConvertTitle}
          </h2>
          <ul style="margin:0 0 24px;padding-left:20px;">
            ${renderList(s.sectionConvert)}
          </ul>
        </td></tr>

        <!-- Organize -->
        <tr><td style="padding:0 40px;">
          <h2 style="margin:0 0 8px;font-size:17px;color:${ink};font-weight:700;">
            ${s.sectionOrganizeTitle}
          </h2>
          <ul style="margin:0 0 24px;padding-left:20px;">
            ${renderList(s.sectionOrganize)}
          </ul>
        </td></tr>

        <!-- Protect -->
        <tr><td style="padding:0 40px;">
          <h2 style="margin:0 0 8px;font-size:17px;color:${ink};font-weight:700;">
            ${s.sectionProtectTitle}
          </h2>
          <ul style="margin:0 0 28px;padding-left:20px;">
            ${renderList(s.sectionProtect)}
          </ul>
        </td></tr>

        <!-- Help + signoff -->
        <tr><td style="padding:0 40px 36px;">
          <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${ink};">
              ${s.helpLine}
            </p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
              ${s.helpReply}
            </p>
          </div>
          <p style="margin:0;white-space:pre-line;color:#475569;font-size:14px;line-height:1.6;">
            ${s.signoff}
          </p>
        </td></tr>

        <!-- Footer with low-contrast trial disclaimer -->
        <tr><td style="background:#fafafa;padding:18px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:${muted};font-size:9px;line-height:1.55;">
            ${s.disclaimer(formattedDate, cancelUrl, priceFormatted)}
          </p>
          <p style="margin:10px 0 0;color:${muted};font-size:9px;">
            © 2026 ${brandName} — <a href="${cancelUrl}" style="color:${muted};text-decoration:underline;">${s.manageBtn}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS_VERIFIED,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: s.subject,
      html,
      text: htmlToText(html),
      headers: TRANSACTIONAL_HEADERS,
    });
    if (result.error) {
      console.error("[Email] Failed to send welcome email:", result.error);
      return false;
    }
    console.log("[Email] Welcome email sent to:", to, "id:", result.data?.id, "lang:", langCode);
    return true;
  } catch (err) {
    console.error("[Email] Error sending welcome email:", err);
    return false;
  }
}

/* =============================================================
   RECOVERY EMAILS — "tu archivo está listo, descárgalo"
   For users who edited a PDF but never downloaded it (abandoned,
   paymentStatus=pending). NO mention of price/payment/buy — the CTA
   just brings them back; the paywall does the selling on-site. Also
   showcases every tool to create need. 3-stage sequence: +1h / +24h /
   last-chance before the file is deleted (real 7-day retention).
   ============================================================= */

type RecoveryLang = {
  subject: (stage: number, doc: string) => string;
  hero: (stage: number) => string;
  fileReady: string;      // small label over the file card
  intro: (doc: string) => string;
  cta: string;            // download button
  expires: (date: string) => string;   // urgency line
  toolsTitle: string;
  tools: [string, string][];           // [name, one-liner]
  footerNote: string;
  unsub: string;
};

const RECOVERY_STRINGS: Record<string, RecoveryLang> = {
  es: {
    subject: (stage, doc) =>
      stage >= 3 ? `Última oportunidad: tu archivo se elimina pronto`
      : stage === 2 ? `Tu archivo sigue disponible — ${doc}`
      : `Tu archivo está listo — ${doc}`,
    hero: (stage) =>
      stage >= 3 ? "Última oportunidad para descargar tu archivo"
      : stage === 2 ? "Tu archivo sigue esperándote"
      : "Tu archivo está listo",
    fileReady: "LISTO PARA DESCARGAR",
    intro: (doc) => `Terminaste de trabajar en <strong>${doc}</strong> pero no llegaste a descargarlo. Aún lo tienes guardado — vuelve y descárgalo cuando quieras.`,
    cta: "Descargar mi archivo",
    expires: (date) => `Tu archivo estará disponible hasta el <strong>${date}</strong>. Después se eliminará de forma automática.`,
    toolsTitle: "Todo lo que puedes hacer con tus PDF",
    tools: [
      ["✏️ Editar texto", "Modifica el contenido directamente en el navegador"],
      ["🔄 Convertir", "PDF a Word, Excel, PowerPoint o JPG (y al revés)"],
      ["🗂️ Unir y dividir", "Combina varios PDF o separa páginas en segundos"],
      ["🗜️ Comprimir", "Reduce el peso de tus archivos sin perder calidad"],
      ["✍️ Firmar", "Añade tu firma a cualquier documento"],
      ["🔒 Proteger", "Pon contraseña y marca de agua a tus PDF"],
    ],
    footerNote: "Recibes este email porque editaste un documento en editorpdf.net.",
    unsub: "No quiero recibir más recordatorios",
  },
  en: {
    subject: (stage, doc) =>
      stage >= 3 ? `Last chance: your file is about to be deleted`
      : stage === 2 ? `Your file is still available — ${doc}`
      : `Your file is ready — ${doc}`,
    hero: (stage) =>
      stage >= 3 ? "Last chance to download your file"
      : stage === 2 ? "Your file is still waiting for you"
      : "Your file is ready",
    fileReady: "READY TO DOWNLOAD",
    intro: (doc) => `You finished working on <strong>${doc}</strong> but didn't download it. It's still saved — come back and grab it whenever you like.`,
    cta: "Download my file",
    expires: (date) => `Your file will be available until <strong>${date}</strong>. After that it's deleted automatically.`,
    toolsTitle: "Everything you can do with your PDFs",
    tools: [
      ["✏️ Edit text", "Change the content right in your browser"],
      ["🔄 Convert", "PDF to Word, Excel, PowerPoint or JPG (and back)"],
      ["🗂️ Merge & split", "Combine PDFs or split pages in seconds"],
      ["🗜️ Compress", "Shrink your files without losing quality"],
      ["✍️ Sign", "Add your signature to any document"],
      ["🔒 Protect", "Password-protect and watermark your PDFs"],
    ],
    footerNote: "You're receiving this because you edited a document at editorpdf.net.",
    unsub: "Stop sending me reminders",
  },
  fr: {
    subject: (stage, doc) => stage >= 3 ? `Dernière chance : votre fichier va bientôt être supprimé` : stage === 2 ? `Votre fichier est toujours disponible — ${doc}` : `Votre fichier est prêt — ${doc}`,
    hero: (stage) => stage >= 3 ? "Dernière chance de télécharger votre fichier" : stage === 2 ? "Votre fichier vous attend toujours" : "Votre fichier est prêt",
    fileReady: "PRÊT À TÉLÉCHARGER",
    intro: (doc) => `Vous avez fini de travailler sur <strong>${doc}</strong> mais vous ne l'avez pas téléchargé. Il est toujours enregistré — revenez le récupérer quand vous voulez.`,
    cta: "Télécharger mon fichier",
    expires: (date) => `Votre fichier sera disponible jusqu'au <strong>${date}</strong>. Ensuite, il sera supprimé automatiquement.`,
    toolsTitle: "Tout ce que vous pouvez faire avec vos PDF",
    tools: [
      ["✏️ Modifier le texte", "Changez le contenu directement dans le navigateur"],
      ["🔄 Convertir", "PDF vers Word, Excel, PowerPoint ou JPG (et inversement)"],
      ["🗂️ Fusionner et diviser", "Combinez des PDF ou séparez des pages en quelques secondes"],
      ["🗜️ Compresser", "Réduisez la taille de vos fichiers sans perte de qualité"],
      ["✍️ Signer", "Ajoutez votre signature à n'importe quel document"],
      ["🔒 Protéger", "Protégez par mot de passe et filigranez vos PDF"],
    ],
    footerNote: "Vous recevez cet e-mail car vous avez modifié un document sur editorpdf.net.",
    unsub: "Ne plus recevoir de rappels",
  },
  de: {
    subject: (stage, doc) => stage >= 3 ? `Letzte Chance: Ihre Datei wird bald gelöscht` : stage === 2 ? `Ihre Datei ist noch verfügbar — ${doc}` : `Ihre Datei ist fertig — ${doc}`,
    hero: (stage) => stage >= 3 ? "Letzte Chance, Ihre Datei herunterzuladen" : stage === 2 ? "Ihre Datei wartet noch auf Sie" : "Ihre Datei ist fertig",
    fileReady: "BEREIT ZUM DOWNLOAD",
    intro: (doc) => `Sie haben <strong>${doc}</strong> fertig bearbeitet, aber nicht heruntergeladen. Sie ist noch gespeichert — kommen Sie zurück und laden Sie sie herunter, wann immer Sie möchten.`,
    cta: "Meine Datei herunterladen",
    expires: (date) => `Ihre Datei ist bis zum <strong>${date}</strong> verfügbar. Danach wird sie automatisch gelöscht.`,
    toolsTitle: "Alles, was Sie mit Ihren PDFs machen können",
    tools: [
      ["✏️ Text bearbeiten", "Ändern Sie den Inhalt direkt im Browser"],
      ["🔄 Konvertieren", "PDF zu Word, Excel, PowerPoint oder JPG (und zurück)"],
      ["🗂️ Zusammenfügen & teilen", "PDFs kombinieren oder Seiten in Sekunden trennen"],
      ["🗜️ Komprimieren", "Verkleinern Sie Ihre Dateien ohne Qualitätsverlust"],
      ["✍️ Unterschreiben", "Fügen Sie jedem Dokument Ihre Unterschrift hinzu"],
      ["🔒 Schützen", "Schützen Sie Ihre PDFs mit Passwort und Wasserzeichen"],
    ],
    footerNote: "Sie erhalten diese E-Mail, weil Sie ein Dokument auf editorpdf.net bearbeitet haben.",
    unsub: "Keine Erinnerungen mehr erhalten",
  },
  pt: {
    subject: (stage, doc) => stage >= 3 ? `Última oportunidade: o seu ficheiro será apagado em breve` : stage === 2 ? `O seu ficheiro ainda está disponível — ${doc}` : `O seu ficheiro está pronto — ${doc}`,
    hero: (stage) => stage >= 3 ? "Última oportunidade para descarregar o seu ficheiro" : stage === 2 ? "O seu ficheiro ainda está à sua espera" : "O seu ficheiro está pronto",
    fileReady: "PRONTO PARA DESCARREGAR",
    intro: (doc) => `Terminou de trabalhar em <strong>${doc}</strong> mas não o descarregou. Continua guardado — volte e descarregue-o quando quiser.`,
    cta: "Descarregar o meu ficheiro",
    expires: (date) => `O seu ficheiro estará disponível até <strong>${date}</strong>. Depois será apagado automaticamente.`,
    toolsTitle: "Tudo o que pode fazer com os seus PDF",
    tools: [
      ["✏️ Editar texto", "Altere o conteúdo diretamente no navegador"],
      ["🔄 Converter", "PDF para Word, Excel, PowerPoint ou JPG (e vice-versa)"],
      ["🗂️ Juntar e dividir", "Combine vários PDF ou separe páginas em segundos"],
      ["🗜️ Comprimir", "Reduza o tamanho dos ficheiros sem perder qualidade"],
      ["✍️ Assinar", "Adicione a sua assinatura a qualquer documento"],
      ["🔒 Proteger", "Proteja com palavra-passe e marca de água os seus PDF"],
    ],
    footerNote: "Recebe este email porque editou um documento em editorpdf.net.",
    unsub: "Não quero receber mais lembretes",
  },
  it: {
    subject: (stage, doc) => stage >= 3 ? `Ultima possibilità: il tuo file sta per essere eliminato` : stage === 2 ? `Il tuo file è ancora disponibile — ${doc}` : `Il tuo file è pronto — ${doc}`,
    hero: (stage) => stage >= 3 ? "Ultima possibilità per scaricare il tuo file" : stage === 2 ? "Il tuo file ti sta ancora aspettando" : "Il tuo file è pronto",
    fileReady: "PRONTO PER IL DOWNLOAD",
    intro: (doc) => `Hai finito di lavorare su <strong>${doc}</strong> ma non l'hai scaricato. È ancora salvato — torna e scaricalo quando vuoi.`,
    cta: "Scarica il mio file",
    expires: (date) => `Il tuo file sarà disponibile fino al <strong>${date}</strong>. Dopo verrà eliminato automaticamente.`,
    toolsTitle: "Tutto ciò che puoi fare con i tuoi PDF",
    tools: [
      ["✏️ Modifica testo", "Cambia il contenuto direttamente nel browser"],
      ["🔄 Converti", "PDF in Word, Excel, PowerPoint o JPG (e viceversa)"],
      ["🗂️ Unisci e dividi", "Combina più PDF o separa le pagine in pochi secondi"],
      ["🗜️ Comprimi", "Riduci il peso dei file senza perdere qualità"],
      ["✍️ Firma", "Aggiungi la tua firma a qualsiasi documento"],
      ["🔒 Proteggi", "Proteggi con password e filigrana i tuoi PDF"],
    ],
    footerNote: "Ricevi questa email perché hai modificato un documento su editorpdf.net.",
    unsub: "Non voglio più ricevere promemoria",
  },
  nl: {
    subject: (stage, doc) => stage >= 3 ? `Laatste kans: je bestand wordt binnenkort verwijderd` : stage === 2 ? `Je bestand is nog beschikbaar — ${doc}` : `Je bestand is klaar — ${doc}`,
    hero: (stage) => stage >= 3 ? "Laatste kans om je bestand te downloaden" : stage === 2 ? "Je bestand wacht nog op je" : "Je bestand is klaar",
    fileReady: "KLAAR OM TE DOWNLOADEN",
    intro: (doc) => `Je bent klaar met werken aan <strong>${doc}</strong> maar hebt het niet gedownload. Het is nog opgeslagen — kom terug en download het wanneer je wilt.`,
    cta: "Mijn bestand downloaden",
    expires: (date) => `Je bestand is beschikbaar tot <strong>${date}</strong>. Daarna wordt het automatisch verwijderd.`,
    toolsTitle: "Alles wat je met je PDF's kunt doen",
    tools: [
      ["✏️ Tekst bewerken", "Wijzig de inhoud direct in je browser"],
      ["🔄 Converteren", "PDF naar Word, Excel, PowerPoint of JPG (en terug)"],
      ["🗂️ Samenvoegen & splitsen", "Combineer PDF's of splits pagina's in seconden"],
      ["🗜️ Comprimeren", "Verklein je bestanden zonder kwaliteitsverlies"],
      ["✍️ Ondertekenen", "Voeg je handtekening toe aan elk document"],
      ["🔒 Beveiligen", "Beveilig je PDF's met wachtwoord en watermerk"],
    ],
    footerNote: "Je ontvangt deze e-mail omdat je een document hebt bewerkt op editorpdf.net.",
    unsub: "Geen herinneringen meer ontvangen",
  },
  pl: {
    subject: (stage, doc) => stage >= 3 ? `Ostatnia szansa: Twój plik wkrótce zostanie usunięty` : stage === 2 ? `Twój plik jest nadal dostępny — ${doc}` : `Twój plik jest gotowy — ${doc}`,
    hero: (stage) => stage >= 3 ? "Ostatnia szansa, aby pobrać plik" : stage === 2 ? "Twój plik wciąż na Ciebie czeka" : "Twój plik jest gotowy",
    fileReady: "GOTOWY DO POBRANIA",
    intro: (doc) => `Skończyłeś pracę nad <strong>${doc}</strong>, ale go nie pobrałeś. Nadal jest zapisany — wróć i pobierz go, kiedy chcesz.`,
    cta: "Pobierz mój plik",
    expires: (date) => `Twój plik będzie dostępny do <strong>${date}</strong>. Potem zostanie automatycznie usunięty.`,
    toolsTitle: "Wszystko, co możesz zrobić ze swoimi PDF",
    tools: [
      ["✏️ Edytuj tekst", "Zmieniaj treść bezpośrednio w przeglądarce"],
      ["🔄 Konwertuj", "PDF na Word, Excel, PowerPoint lub JPG (i odwrotnie)"],
      ["🗂️ Łącz i dziel", "Połącz pliki PDF lub podziel strony w kilka sekund"],
      ["🗜️ Kompresuj", "Zmniejsz rozmiar plików bez utraty jakości"],
      ["✍️ Podpisz", "Dodaj swój podpis do dowolnego dokumentu"],
      ["🔒 Zabezpiecz", "Zabezpiecz hasłem i znakiem wodnym swoje PDF"],
    ],
    footerNote: "Otrzymujesz tę wiadomość, ponieważ edytowałeś dokument na editorpdf.net.",
    unsub: "Nie chcę więcej przypomnień",
  },
  ru: {
    subject: (stage, doc) => stage >= 3 ? `Последний шанс: ваш файл скоро будет удалён` : stage === 2 ? `Ваш файл всё ещё доступен — ${doc}` : `Ваш файл готов — ${doc}`,
    hero: (stage) => stage >= 3 ? "Последний шанс скачать ваш файл" : stage === 2 ? "Ваш файл всё ещё ждёт вас" : "Ваш файл готов",
    fileReady: "ГОТОВ К СКАЧИВАНИЮ",
    intro: (doc) => `Вы закончили работу над <strong>${doc}</strong>, но не скачали его. Он всё ещё сохранён — вернитесь и скачайте его в любое время.`,
    cta: "Скачать мой файл",
    expires: (date) => `Ваш файл будет доступен до <strong>${date}</strong>. После этого он будет удалён автоматически.`,
    toolsTitle: "Всё, что вы можете сделать со своими PDF",
    tools: [
      ["✏️ Редактировать текст", "Меняйте содержимое прямо в браузере"],
      ["🔄 Конвертировать", "PDF в Word, Excel, PowerPoint или JPG (и обратно)"],
      ["🗂️ Объединить и разделить", "Объединяйте PDF или разделяйте страницы за секунды"],
      ["🗜️ Сжать", "Уменьшайте размер файлов без потери качества"],
      ["✍️ Подписать", "Добавьте свою подпись к любому документу"],
      ["🔒 Защитить", "Защитите паролем и водяным знаком свои PDF"],
    ],
    footerNote: "Вы получили это письмо, потому что редактировали документ на editorpdf.net.",
    unsub: "Не присылать напоминания",
  },
  uk: {
    subject: (stage, doc) => stage >= 3 ? `Останній шанс: ваш файл скоро буде видалено` : stage === 2 ? `Ваш файл усе ще доступний — ${doc}` : `Ваш файл готовий — ${doc}`,
    hero: (stage) => stage >= 3 ? "Останній шанс завантажити ваш файл" : stage === 2 ? "Ваш файл усе ще чекає на вас" : "Ваш файл готовий",
    fileReady: "ГОТОВИЙ ДО ЗАВАНТАЖЕННЯ",
    intro: (doc) => `Ви завершили роботу над <strong>${doc}</strong>, але не завантажили його. Він усе ще збережений — поверніться та завантажте його будь-коли.`,
    cta: "Завантажити мій файл",
    expires: (date) => `Ваш файл буде доступний до <strong>${date}</strong>. Після цього його буде видалено автоматично.`,
    toolsTitle: "Усе, що ви можете зробити зі своїми PDF",
    tools: [
      ["✏️ Редагувати текст", "Змінюйте вміст прямо у браузері"],
      ["🔄 Конвертувати", "PDF у Word, Excel, PowerPoint або JPG (і навпаки)"],
      ["🗂️ Об'єднати та розділити", "Об'єднуйте PDF або розділяйте сторінки за секунди"],
      ["🗜️ Стиснути", "Зменшуйте розмір файлів без втрати якості"],
      ["✍️ Підписати", "Додайте свій підпис до будь-якого документа"],
      ["🔒 Захистити", "Захистіть паролем і водяним знаком свої PDF"],
    ],
    footerNote: "Ви отримали цей лист, бо редагували документ на editorpdf.net.",
    unsub: "Не надсилати нагадування",
  },
  ro: {
    subject: (stage, doc) => stage >= 3 ? `Ultima șansă: fișierul tău va fi șters în curând` : stage === 2 ? `Fișierul tău este încă disponibil — ${doc}` : `Fișierul tău este gata — ${doc}`,
    hero: (stage) => stage >= 3 ? "Ultima șansă să îți descarci fișierul" : stage === 2 ? "Fișierul tău încă te așteaptă" : "Fișierul tău este gata",
    fileReady: "GATA DE DESCĂRCARE",
    intro: (doc) => `Ai terminat de lucrat la <strong>${doc}</strong>, dar nu l-ai descărcat. Este încă salvat — întoarce-te și descarcă-l oricând vrei.`,
    cta: "Descarcă fișierul meu",
    expires: (date) => `Fișierul tău va fi disponibil până pe <strong>${date}</strong>. După aceea va fi șters automat.`,
    toolsTitle: "Tot ce poți face cu PDF-urile tale",
    tools: [
      ["✏️ Editează text", "Modifică conținutul direct în browser"],
      ["🔄 Convertește", "PDF în Word, Excel, PowerPoint sau JPG (și invers)"],
      ["🗂️ Îmbină și împarte", "Combină PDF-uri sau separă pagini în câteva secunde"],
      ["🗜️ Comprimă", "Reduce dimensiunea fișierelor fără a pierde calitate"],
      ["✍️ Semnează", "Adaugă semnătura ta pe orice document"],
      ["🔒 Protejează", "Protejează cu parolă și filigran PDF-urile tale"],
    ],
    footerNote: "Primești acest email pentru că ai editat un document pe editorpdf.net.",
    unsub: "Nu mai vreau memento-uri",
  },
  zh: {
    subject: (stage, doc) => stage >= 3 ? `最后机会：您的文件即将被删除` : stage === 2 ? `您的文件仍然可用 — ${doc}` : `您的文件已就绪 — ${doc}`,
    hero: (stage) => stage >= 3 ? "下载文件的最后机会" : stage === 2 ? "您的文件仍在等待您" : "您的文件已就绪",
    fileReady: "可供下载",
    intro: (doc) => `您已完成对 <strong>${doc}</strong> 的编辑，但尚未下载。它仍已保存 — 随时回来下载。`,
    cta: "下载我的文件",
    expires: (date) => `您的文件将保留到 <strong>${date}</strong>，之后将自动删除。`,
    toolsTitle: "您可以用 PDF 做的一切",
    tools: [
      ["✏️ 编辑文字", "直接在浏览器中修改内容"],
      ["🔄 转换", "PDF 转 Word、Excel、PowerPoint 或 JPG（以及反向）"],
      ["🗂️ 合并与拆分", "几秒内合并多个 PDF 或拆分页面"],
      ["🗜️ 压缩", "在不损失质量的情况下缩小文件"],
      ["✍️ 签名", "为任何文档添加您的签名"],
      ["🔒 保护", "为您的 PDF 设置密码和水印"],
    ],
    footerNote: "您收到此邮件是因为您在 editorpdf.net 上编辑了文档。",
    unsub: "不再接收提醒",
  },
};

export async function sendRecoveryEmail(opts: {
  to: string;
  lang?: string;
  docName: string;
  downloadUrl: string;
  unsubscribeUrl: string;
  expiresDate: string;   // already formatted for the user
  stage: number;         // 1 | 2 | 3
}): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping recovery email");
    return false;
  }
  const { to, docName, downloadUrl, unsubscribeUrl, expiresDate, stage } = opts;
  const s = RECOVERY_STRINGS[(opts.lang || "es").slice(0, 2)] ?? RECOVERY_STRINGS.en;
  const ink = "#0A0A0B", accent = "#E63946", muted = "#94a3b8";
  const safeDoc = docName.replace(/[<>]/g, "");

  const toolsHtml = s.tools.map(([name, desc]) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #f1f1f4;">
        <p style="margin:0;color:${ink};font-size:14px;font-weight:700;">${name}</p>
        <p style="margin:2px 0 0;color:#5A5A62;font-size:12.5px;line-height:1.4;">${desc}</p>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="${(opts.lang || "es").slice(0, 2)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(10,10,11,0.08);">

      <!-- Header -->
      <tr><td style="padding:22px 40px;border-bottom:1px solid #f1f1f4;">
        <span style="font-weight:800;font-size:18px;letter-spacing:-0.03em;color:${ink};">editorpdf<span style="color:${accent};">.net</span></span>
      </td></tr>

      <!-- Hero -->
      <tr><td style="padding:34px 40px 8px;">
        <h1 style="margin:0;color:${ink};font-size:26px;line-height:1.15;letter-spacing:-0.02em;font-weight:800;">${s.hero(stage)}</h1>
      </td></tr>

      <!-- File card -->
      <tr><td style="padding:16px 40px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDECEE;border:1px solid #F2C1C6;border-radius:12px;">
          <tr>
            <td style="padding:16px 18px;width:44px;vertical-align:middle;">
              <div style="width:40px;height:48px;background:#ffffff;border-radius:8px;text-align:center;line-height:48px;font-size:22px;">📄</div>
            </td>
            <td style="padding:16px 8px;vertical-align:middle;">
              <p style="margin:0 0 3px;color:${accent};font-size:10px;font-weight:800;letter-spacing:0.1em;">${s.fileReady}</p>
              <p style="margin:0;color:${ink};font-size:15px;font-weight:700;word-break:break-all;">${safeDoc}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Intro -->
      <tr><td style="padding:18px 40px 0;">
        <p style="margin:0;color:#5A5A62;font-size:15px;line-height:1.6;">${s.intro(safeDoc)}</p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:24px 40px 6px;" align="center">
        <a href="${downloadUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:12px;font-size:16px;font-weight:800;box-shadow:0 8px 20px -6px rgba(230,57,70,0.5);">${s.cta}</a>
      </td></tr>

      <!-- Urgency -->
      <tr><td style="padding:8px 40px 26px;" align="center">
        <p style="margin:0;color:#8A8A92;font-size:12.5px;line-height:1.5;">${s.expires(expiresDate)}</p>
      </td></tr>

      <!-- Tools showcase -->
      <tr><td style="padding:6px 40px 8px;border-top:1px solid #f1f1f4;">
        <p style="margin:22px 0 6px;color:${ink};font-size:15px;font-weight:800;">${s.toolsTitle}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${toolsHtml}</table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f1f1f4;">
        <p style="margin:0;color:${muted};font-size:11px;line-height:1.6;">${s.footerNote}</p>
        <p style="margin:8px 0 0;color:${muted};font-size:11px;">© 2026 ${brandName} · <a href="${unsubscribeUrl}" style="color:${muted};text-decoration:underline;">${s.unsub}</a></p>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`.trim();

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS_VERIFIED,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: s.subject(stage, safeDoc),
      html,
      text: htmlToText(html),
      // Marketing email → List-Unsubscribe (one-click) for deliverability + law.
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) { console.error("[Email] recovery send failed:", result.error); return false; }
    console.log("[Email] recovery sent to:", to, "stage:", stage, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Email] recovery error:", err);
    return false;
  }
}

/**
 * Send a password reset link. The token is generated by the caller
 * (`forgotPassword` in routers.ts) and stored on the user row; we just
 * deliver it. Uses the verified noreply@editorpdf.net domain so the link
 * arrives in the inbox, not spam.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping password reset email");
    return false;
  }

  const greeting = name ? `Hola ${name}` : "Hola";
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Restablecer contraseña — ${brandName}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A0A0B;padding:32px 40px;text-align:center;">
          <span style="color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
            Editor<span style="color:#E63946;">PDF</span>
          </span>
        </td></tr>
        <tr><td style="padding:40px 40px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#0A0A0B;font-weight:700;">Restablecer tu contraseña</h1>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            ${greeting}, hemos recibido una solicitud para cambiar la contraseña de tu cuenta de ${brandName}. Pulsa el botón para crear una nueva.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td>
            <a href="${resetUrl}" style="display:inline-block;background:#E63946;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
              Crear nueva contraseña
            </a>
          </td></tr></table>
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#475569;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;">
            ${resetUrl}
          </p>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
            El enlace caduca en 1 hora. Si no fuiste tú quien hizo la solicitud, puedes ignorar este correo — tu contraseña actual sigue funcionando.
          </p>
        </td></tr>
        <tr><td style="background:#f8faff;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            © 2026 ${brandName} · <a href="https://editorpdf.net" style="color:#94a3b8;">editorpdf.net</a> · ¿Preguntas? <a href="mailto:${REPLY_TO_ADDRESS}" style="color:#94a3b8;">${REPLY_TO_ADDRESS}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS_VERIFIED,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: `Restablecer tu contraseña en ${brandName}`,
      html,
      text: htmlToText(html),
      headers: TRANSACTIONAL_HEADERS,
    });
    if (result.error) {
      console.error("[Email] Failed to send password reset email:", result.error);
      return false;
    }
    console.log("[Email] Password reset email sent to:", to, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Email] Error sending password reset email:", err);
    return false;
  }
}

/**
 * Reply to a contact-form message from the admin panel. `userMessage` is the
 * original message (rendered as a quoted block) so the user has context;
 * `replyBody` is what the admin typed.
 */
export async function sendContactReplyEmail({
  to,
  toName,
  originalSubject,
  originalMessage,
  replyBody,
}: {
  to: string;
  toName: string;
  originalSubject: string;
  originalMessage: string;
  replyBody: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping contact reply email");
    return false;
  }

  // Escape minimal HTML so user-submitted text doesn't break the layout
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const replyHtml = esc(replyBody).replace(/\n/g, "<br />");
  const originalHtml = esc(originalMessage).replace(/\n/g, "<br />");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Re: ${esc(originalSubject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A0A0B;padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
            Editor<span style="color:#E63946;">PDF</span>
          </span>
        </td></tr>
        <tr><td style="padding:32px 40px 16px;">
          <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
            Hola ${esc(toName)}, gracias por contactar con ${brandName}. Esta es nuestra respuesta a tu mensaje:
          </p>
          <div style="margin:0 0 28px;padding:16px 20px;background:#f8fafc;border-left:3px solid #E63946;border-radius:6px;color:#0f172a;font-size:14px;line-height:1.7;">
            ${replyHtml}
          </div>
          <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tu mensaje original</p>
          <div style="margin:0 0 28px;padding:14px 18px;background:#fafafa;border:1px solid #e2e8f0;border-radius:6px;color:#64748b;font-size:13px;line-height:1.6;">
            <strong>Asunto:</strong> ${esc(originalSubject)}<br /><br />
            ${originalHtml}
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
            Para continuar la conversación, simplemente responde a este email.
          </p>
        </td></tr>
        <tr><td style="background:#f8faff;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 ${brandName} · <a href="https://editorpdf.net" style="color:#94a3b8;">editorpdf.net</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS_VERIFIED,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: `Re: ${originalSubject}`,
      html,
      text: htmlToText(html),
      headers: {
        // Contact reply is a real conversation — don't tag as auto-generated
        // (gmail trusts human-replied threads more). Keep just the
        // suppression header to avoid auto-vacation responses bouncing back.
        "X-Auto-Response-Suppress": "All",
      },
    });
    if (result.error) {
      console.error("[Email] Failed to send contact reply:", result.error);
      return false;
    }
    console.log("[Email] Contact reply sent to:", to, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Email] Error sending contact reply:", err);
    return false;
  }
}

/**
 * Send a payment confirmation email after a successful subscription
 */
export async function sendPaymentConfirmationEmail({
  to,
  name,
  trialEndDate,
  monthlyPrice,
  trialPrice = "0€",
  cancelUrl,
}: {
  to: string;
  name: string;
  trialEndDate: Date;
  monthlyPrice?: string;
  trialPrice?: string;
  cancelUrl: string;
}): Promise<boolean> {
  // Default monthlyPrice to the live admin-set price (site_settings.subscription_price_eur)
  // when the caller doesn't override it. Falls back to 19,99€ if the setting is empty.
  if (!monthlyPrice) {
    const { getActiveMonthlyPrice } = await import("./db");
    monthlyPrice = (await getActiveMonthlyPrice()).formatted;
  }

  const formattedDate = trialEndDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de pago — ${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a3c6e;padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Editor<span style="color:#60a5fa;">PDF</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#1a3c6e;font-weight:700;">
                ✅ ¡Pago confirmado!
              </h1>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Hola <strong>${name}</strong>, tu período de prueba de 48 horas ha comenzado. Ya tienes acceso completo a todas las funciones de ${brandName}.
              </p>

              <!-- Summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Resumen de tu suscripción</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#475569;font-size:14px;">Cargo inicial (prueba 48 horas)</td>
                        <td align="right" style="padding:6px 0;color:#1a3c6e;font-size:14px;font-weight:600;">${trialPrice}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#475569;font-size:14px;">Precio mensual tras el período de prueba</td>
                        <td align="right" style="padding:6px 0;color:#1a3c6e;font-size:14px;font-weight:600;">${monthlyPrice}/mes</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:12px;border-top:1px solid #e2e8f0;"></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#475569;font-size:14px;">Fin del período de prueba</td>
                        <td align="right" style="padding:6px 0;color:#1a3c6e;font-size:14px;font-weight:600;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      <strong>⚠️ Recuerda:</strong> Si no cancelas antes del <strong>${formattedDate}</strong>, se te cobrarán automáticamente <strong>${monthlyPrice}/mes</strong> hasta que canceles. Puedes cancelar en cualquier momento desde tu cuenta.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Puedes cancelar tu suscripción en cualquier momento antes de que finalice el período de prueba sin ningún coste adicional.
              </p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="https://editorpdf.net/es/dashboard" style="display:inline-block;background:#1a3c6e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                      Ir a mi panel
                    </a>
                  </td>
                  <td>
                    <a href="${cancelUrl}" style="display:inline-block;background:#ffffff;color:#1a3c6e;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid #1a3c6e;">
                      Cancelar suscripción
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.6;">
                Has recibido este email porque completaste una compra en <a href="https://editorpdf.net" style="color:#1a3c6e;">editorpdf.net</a>. Si no reconoces esta compra, contacta con nosotros en <a href="mailto:support@editorpdf.net" style="color:#1a3c6e;">support@editorpdf.net</a>.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © 2026 ${brandName} — <a href="https://editorpdf.net/es/terms" style="color:#94a3b8;">Términos de uso</a> · <a href="https://editorpdf.net/es/privacy" style="color:#94a3b8;">Privacidad</a> · <a href="${cancelUrl}" style="color:#94a3b8;">Cancelar suscripción</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (!resend) {
    console.warn("[Email] Resend not configured, skipping confirmation email");
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: `✅ Confirmación de pago — ${brandName} (prueba 48 horas)`,
      html,
      text: htmlToText(html),
      headers: TRANSACTIONAL_HEADERS,
    });

    if (result.error) {
      console.error("[Email] Failed to send confirmation email:", result.error);
      return false;
    }

    console.log("[Email] Confirmation email sent to:", to, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Email] Error sending confirmation email:", err);
    return false;
  }
}

/**
 * Send a cancellation confirmation email when user cancels their subscription
 */
export async function sendCancellationEmail({
  to,
  name,
  accessUntilDate,
  reactivateUrl,
}: {
  to: string;
  name: string;
  accessUntilDate: Date;
  reactivateUrl: string;
}): Promise<boolean> {
  const formattedDate = accessUntilDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Suscripción cancelada — ${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a3c6e;padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Editor<span style="color:#60a5fa;">PDF</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#1a3c6e;font-weight:700;">
                Suscripción cancelada
              </h1>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Hola <strong>${name}</strong>, hemos recibido tu solicitud de cancelación. Tu suscripción ha sido cancelada correctamente.
              </p>

              <!-- Access info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#C82F3B;text-transform:uppercase;letter-spacing:0.5px;">✅ Tu acceso continúa</p>
                    <p style="margin:0;color:#15803d;font-size:15px;line-height:1.6;">
                      Aunque has cancelado, seguirás teniendo acceso completo a todas las funciones de ${brandName} hasta el <strong>${formattedDate}</strong>. No se realizará ningún cargo adicional.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento antes del <strong>${formattedDate}</strong> sin perder el acceso ni pagar de nuevo.
              </p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${reactivateUrl}" style="display:inline-block;background:#1a3c6e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                      Reactivar suscripción
                    </a>
                  </td>
                  <td>
                    <a href="https://editorpdf.net/es/dashboard" style="display:inline-block;background:#ffffff;color:#1a3c6e;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid #1a3c6e;">
                      Ir a mi panel
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;line-height:1.6;">
                ¿Tuviste algún problema o quieres contarnos por qué cancelaste? Escríbenos a <a href="mailto:support@editorpdf.net" style="color:#1a3c6e;">support@editorpdf.net</a> — tu opinión nos ayuda a mejorar.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                © 2026 ${brandName} — <a href="https://editorpdf.net/es/terms" style="color:#94a3b8;">Términos de uso</a> · <a href="https://editorpdf.net/es/privacy" style="color:#94a3b8;">Privacidad</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (!resend) {
    console.warn("[Email] Resend not configured, skipping cancellation email");
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject: `Tu suscripción a ${brandName} ha sido cancelada`,
      html,
      text: htmlToText(html),
      headers: TRANSACTIONAL_HEADERS,
    });

    if (result.error) {
      console.error("[Email] Failed to send cancellation email:", result.error);
      return false;
    }

    console.log("[Email] Cancellation email sent to:", to, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Email] Error sending cancellation email:", err);
    return false;
  }
}

/**
 * Seed long, friendly multilingual templates for users asking about
 * the recurring charge / wanting to cancel. Structure (same in all
 * 12 languages):
 *
 *   1) HOW TO CANCEL — exact step-by-step (the user's main concern)
 *   2) WHERE THE PRICE WAS SHOWN — pricing / paywall / terms / 3D-Secure
 *   3) REFUND POLICY — link + offer to find a solution
 *
 * Deliberately does NOT mention specific amounts (€19.99 / €39.90),
 * because pricing has changed across cohorts. Friendly tone designed
 * to defuse chargeback intent.
 *
 * Idempotent — skips templates that already exist by name.
 *
 * Usage: railway run node scripts/seed-email-templates-multilang.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Helper to build the body for a given language. Pulls together the
// 3 sections plus a small PS offering screenshots on request.
const TEMPLATES = [
  // ─────────────────────────────── ES ───────────────────────────────
  {
    name: "ES — Cancelar y aclaración (completo)",
    body: `Hola {{name}},

Gracias por escribirnos — estamos aquí para ayudarte y entendemos perfectamente tu inquietud. Vamos a explicártelo todo con claridad.

A continuación tienes: (1) los pasos exactos para cancelar la suscripción en menos de un minuto, (2) un resumen de los puntos donde se muestra el precio recurrente al darse de alta, y (3) nuestra política de reembolso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) CÓMO CANCELAR — 30 SEGUNDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Inicia sesión en tu cuenta:
   https://editorpdf.net/es/login

2. Ve al Panel → pestaña "Facturación":
   https://editorpdf.net/es/dashboard?tab=billing

3. Pulsa el botón "Cancelar suscripción".

4. Confirma. Tu suscripción seguirá activa hasta el final del periodo ya facturado, y no se realizará ningún cargo posterior.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) DÓNDE SE MUESTRA EL PRECIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Procuramos ser totalmente transparentes con el carácter recurrente. Estos son los lugares donde figura el precio mensual:

→ Página de precios:
  https://editorpdf.net/es/pricing
  La cuota mensual aparece de forma destacada en la tarjeta del plan.

→ Paywall (justo antes del pago):
  Encima del botón de "Descargar" hay un aviso visible que indica que, si no cancelas antes de que finalice la prueba, se facturará automáticamente la cuota mensual hasta que canceles.

→ Términos y Condiciones, apartado 4 ("Modelo de suscripción y precios"):
  https://editorpdf.net/es/terms

→ Stripe — verificación 3D-Secure:
  Al completar el pago, tu banco te pidió validar la operación mediante un SMS o tu aplicación bancaria. Esto constituye una segunda confirmación adicional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLÍTICA DE REEMBOLSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nuestra política completa está aquí:
https://editorpdf.net/es/refund

Si genuinamente no eras consciente del carácter recurrente del servicio, simplemente responde a este email y haremos lo posible por encontrar una solución que te encaje.

Un saludo cordial,
Equipo EditorPDF`,
  },

  // ─────────────────────────────── EN ───────────────────────────────
  {
    name: "EN — Cancel & clarification (full)",
    body: `Hi {{name}},

Thanks for reaching out — we're here to help and we completely understand your concern. Let's walk you through everything clearly.

Below you'll find: (1) the exact steps to cancel the subscription in under a minute, (2) a summary of where the recurring price is shown during sign-up, and (3) our refund policy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) HOW TO CANCEL — 30 SECONDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sign in to your account:
   https://editorpdf.net/en/login

2. Open the Dashboard → "Billing" tab:
   https://editorpdf.net/en/dashboard?tab=billing

3. Click the "Cancel subscription" button.

4. Confirm. Your access stays active until the end of the already-billed period, and no further charges will be made.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) WHERE THE PRICE IS SHOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We aim to be fully transparent about the recurring nature of the plan. These are the places where the monthly price appears:

→ Pricing page:
  https://editorpdf.net/en/pricing
  The monthly fee is displayed prominently on the plan card.

→ Paywall (right before payment):
  A clearly visible notice above the "Download" button states that if you don't cancel before the trial ends, the monthly fee is automatically charged until you cancel.

→ Terms & Conditions, Section 4 ("Subscription model and pricing"):
  https://editorpdf.net/en/terms

→ Stripe — 3D-Secure verification:
  When you completed the payment, your bank required you to validate the transaction via SMS or your banking app. This serves as a second confirmation step.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) REFUND POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Our full refund policy is here:
https://editorpdf.net/en/refund

If you were genuinely unaware of the recurring nature of the service, just reply to this email and we'll do our best to find a fair solution.

Kind regards,
EditorPDF Team`,
  },

  // ─────────────────────────────── FR ───────────────────────────────
  {
    name: "FR — Annuler et clarification (complet)",
    body: `Bonjour {{name}},

Merci de nous avoir écrit — nous sommes là pour vous aider et nous comprenons parfaitement votre inquiétude. Voici toutes les explications de manière claire.

Vous trouverez ci-dessous : (1) les étapes exactes pour annuler l'abonnement en moins d'une minute, (2) un récapitulatif des endroits où le prix récurrent est indiqué lors de l'inscription, et (3) notre politique de remboursement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) COMMENT ANNULER — 30 SECONDES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Connectez-vous à votre compte :
   https://editorpdf.net/fr/login

2. Allez dans le Tableau de bord → onglet « Facturation » :
   https://editorpdf.net/fr/dashboard?tab=billing

3. Cliquez sur le bouton « Annuler l'abonnement ».

4. Confirmez. Votre accès reste actif jusqu'à la fin de la période déjà facturée, et aucun prélèvement supplémentaire ne sera effectué.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) OÙ LE PRIX EST AFFICHÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nous nous efforçons d'être totalement transparents sur le caractère récurrent. Voici les endroits où apparaît le prix mensuel :

→ Page de tarification :
  https://editorpdf.net/fr/pricing
  Le tarif mensuel est affiché de manière visible sur la carte du forfait.

→ Paywall (juste avant le paiement) :
  Au-dessus du bouton « Télécharger » figure un avis clairement visible indiquant que si vous n'annulez pas avant la fin de la période d'essai, le tarif mensuel sera facturé automatiquement jusqu'à l'annulation.

→ Conditions Générales, Section 4 (« Modèle d'abonnement et tarifs ») :
  https://editorpdf.net/fr/terms

→ Stripe — vérification 3D-Secure :
  Lors du paiement, votre banque vous a demandé de valider la transaction par SMS ou via l'application bancaire. C'est une deuxième confirmation supplémentaire.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLITIQUE DE REMBOURSEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notre politique complète :
https://editorpdf.net/fr/refund

Si vous n'étiez réellement pas conscient du caractère récurrent du service, répondez simplement à cet e-mail et nous ferons de notre mieux pour trouver une solution qui vous convienne.

Bien cordialement,
L'équipe EditorPDF`,
  },

  // ─────────────────────────────── DE ───────────────────────────────
  {
    name: "DE — Kündigen & Erklärung (vollständig)",
    body: `Hallo {{name}},

danke für Ihre Nachricht — wir sind hier, um zu helfen, und verstehen Ihr Anliegen voll und ganz. Hier kommt eine klare Erklärung.

Im Folgenden finden Sie: (1) die genauen Schritte zur Kündigung des Abonnements in unter einer Minute, (2) eine Übersicht der Stellen, an denen der wiederkehrende Preis bei der Anmeldung angezeigt wird, und (3) unsere Rückerstattungsrichtlinie.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) SO KÜNDIGEN SIE — 30 SEKUNDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Melden Sie sich in Ihrem Konto an:
   https://editorpdf.net/de/login

2. Gehen Sie zum Dashboard → Reiter „Rechnungen":
   https://editorpdf.net/de/dashboard?tab=billing

3. Klicken Sie auf „Abonnement kündigen".

4. Bestätigen Sie. Ihr Zugang bleibt bis zum Ende des bereits abgerechneten Zeitraums aktiv, und es erfolgen keine weiteren Abbuchungen.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) WO DER PREIS ANGEZEIGT WIRD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wir bemühen uns um vollständige Transparenz hinsichtlich der wiederkehrenden Zahlung. An folgenden Stellen wird der Monatspreis angezeigt:

→ Preisseite:
  https://editorpdf.net/de/pricing
  Der monatliche Preis wird deutlich auf der Plan-Karte angezeigt.

→ Paywall (direkt vor der Zahlung):
  Über dem „Herunterladen"-Button erscheint ein klar sichtbarer Hinweis, dass — falls Sie nicht vor Ende der Testphase kündigen — der Monatsbeitrag automatisch bis zur Kündigung abgebucht wird.

→ AGB, Abschnitt 4 („Abonnement-Modell und Preise"):
  https://editorpdf.net/de/terms

→ Stripe — 3D-Secure-Verifizierung:
  Beim Abschluss der Zahlung verlangte Ihre Bank eine Bestätigung per SMS oder Banking-App. Das ist eine zweite zusätzliche Bestätigung.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) RÜCKERSTATTUNGSRICHTLINIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unsere vollständige Richtlinie:
https://editorpdf.net/de/refund

Wenn Ihnen der wiederkehrende Charakter des Dienstes wirklich nicht bewusst war, antworten Sie einfach auf diese E-Mail, und wir werden unser Bestes tun, eine faire Lösung zu finden.

Mit freundlichen Grüßen,
Das EditorPDF-Team`,
  },

  // ─────────────────────────────── PT ───────────────────────────────
  {
    name: "PT — Cancelar e esclarecimento (completo)",
    body: `Olá {{name}},

Obrigado por nos contactar — estamos aqui para ajudar e compreendemos perfeitamente a sua preocupação. Vamos explicar tudo de forma clara.

Em seguida tem: (1) os passos exatos para cancelar a subscrição em menos de um minuto, (2) um resumo dos locais onde o preço recorrente é mostrado no momento da subscrição, e (3) a nossa política de reembolso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) COMO CANCELAR — 30 SEGUNDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Inicie sessão na sua conta:
   https://editorpdf.net/pt/login

2. Vá ao Painel → separador "Faturação":
   https://editorpdf.net/pt/dashboard?tab=billing

3. Clique no botão "Cancelar subscrição".

4. Confirme. O acesso permanece ativo até ao fim do período já faturado, e não serão feitos mais débitos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) ONDE O PREÇO É MOSTRADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Procuramos ser totalmente transparentes quanto à natureza recorrente. Estes são os locais onde aparece o preço mensal:

→ Página de preços:
  https://editorpdf.net/pt/pricing
  A mensalidade aparece de forma destacada no cartão do plano.

→ Paywall (mesmo antes do pagamento):
  Por cima do botão "Baixar" há um aviso bem visível indicando que, se não cancelar antes do fim do período de teste, a mensalidade será debitada automaticamente até cancelar.

→ Termos e Condições, secção 4 ("Modelo de subscrição e preços"):
  https://editorpdf.net/pt/terms

→ Stripe — verificação 3D-Secure:
  Ao concluir o pagamento, o seu banco pediu-lhe para validar a operação por SMS ou na aplicação bancária. Esta é uma segunda confirmação adicional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLÍTICA DE REEMBOLSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A nossa política completa está aqui:
https://editorpdf.net/pt/refund

Se genuinamente não estava ciente da natureza recorrente do serviço, basta responder a este email e faremos o possível para encontrar uma solução que sirva.

Com os melhores cumprimentos,
Equipa EditorPDF`,
  },

  // ─────────────────────────────── IT ───────────────────────────────
  {
    name: "IT — Annullare e chiarimento (completo)",
    body: `Ciao {{name}},

grazie di averci scritto — siamo qui per aiutarti e comprendiamo perfettamente la tua preoccupazione. Ti spieghiamo tutto in modo chiaro.

Di seguito trovi: (1) i passaggi esatti per cancellare l'abbonamento in meno di un minuto, (2) un riepilogo dei punti in cui viene mostrato il prezzo ricorrente al momento dell'iscrizione, e (3) la nostra politica di rimborso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) COME CANCELLARE — 30 SECONDI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Accedi al tuo account:
   https://editorpdf.net/it/login

2. Vai alla Dashboard → scheda "Fatturazione":
   https://editorpdf.net/it/dashboard?tab=billing

3. Clicca sul pulsante "Cancella abbonamento".

4. Conferma. L'accesso rimane attivo fino alla fine del periodo già fatturato, e non verranno effettuati ulteriori addebiti.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) DOVE VIENE MOSTRATO IL PREZZO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cerchiamo di essere totalmente trasparenti sulla natura ricorrente. Ecco i punti in cui appare il prezzo mensile:

→ Pagina dei prezzi:
  https://editorpdf.net/it/pricing
  Il canone mensile è mostrato in evidenza sulla scheda del piano.

→ Paywall (subito prima del pagamento):
  Sopra il pulsante "Scarica" c'è un avviso ben visibile che indica che, se non annulli prima della fine della prova, il canone mensile verrà addebitato automaticamente fino alla cancellazione.

→ Termini e Condizioni, sezione 4 ("Modello di abbonamento e prezzi"):
  https://editorpdf.net/it/terms

→ Stripe — verifica 3D-Secure:
  Al completamento del pagamento, la tua banca ti ha chiesto di validare l'operazione tramite SMS o app bancaria. È una seconda conferma aggiuntiva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLITICA DI RIMBORSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La nostra politica completa è qui:
https://editorpdf.net/it/refund

Se davvero non eri consapevole della natura ricorrente del servizio, rispondi a questa email e faremo del nostro meglio per trovare una soluzione che ti vada bene.

Cordiali saluti,
Team EditorPDF`,
  },

  // ─────────────────────────────── NL ───────────────────────────────
  {
    name: "NL — Opzeggen & uitleg (volledig)",
    body: `Hallo {{name}},

bedankt voor uw bericht — we zijn er om te helpen en begrijpen uw zorg volledig. Hier komt een duidelijke uitleg.

Hieronder vindt u: (1) de exacte stappen om uw abonnement binnen een minuut op te zeggen, (2) een overzicht van de plaatsen waar de terugkerende prijs bij aanmelding wordt getoond, en (3) ons restitutiebeleid.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) HOE OP TE ZEGGEN — 30 SECONDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Log in op uw account:
   https://editorpdf.net/nl/login

2. Ga naar het Dashboard → tabblad "Facturering":
   https://editorpdf.net/nl/dashboard?tab=billing

3. Klik op de knop "Abonnement opzeggen".

4. Bevestig. Uw toegang blijft actief tot het einde van de reeds gefactureerde periode, en er worden geen verdere kosten in rekening gebracht.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) WAAR DE PRIJS WORDT GETOOND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We streven naar volledige transparantie over het terugkerende karakter. Op deze plekken verschijnt de maandprijs:

→ Prijspagina:
  https://editorpdf.net/nl/pricing
  De maandelijkse prijs staat duidelijk op de plan-kaart.

→ Paywall (vlak vóór de betaling):
  Boven de knop "Downloaden" staat een goed zichtbare melding dat — als u niet vóór het einde van de proef opzegt — de maandprijs automatisch wordt afgeschreven tot opzegging.

→ Algemene Voorwaarden, sectie 4 ("Abonnementsmodel en prijzen"):
  https://editorpdf.net/nl/terms

→ Stripe — 3D-Secure verificatie:
  Bij de afronding van de betaling vroeg uw bank de transactie te bevestigen via sms of bank-app. Dit is een tweede aanvullende bevestiging.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) RESTITUTIEBELEID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ons volledige beleid:
https://editorpdf.net/nl/refund

Als u zich werkelijk niet bewust was van het terugkerende karakter, antwoord dan gewoon op deze e-mail en we zullen ons best doen een passende oplossing te vinden.

Met vriendelijke groet,
Het EditorPDF-team`,
  },

  // ─────────────────────────────── PL ───────────────────────────────
  {
    name: "PL — Anulowanie i wyjaśnienie (pełne)",
    body: `Cześć {{name}},

dziękujemy za wiadomość — jesteśmy tu, aby pomóc, i w pełni rozumiemy Twoje wątpliwości. Oto wszystko wyjaśnione w jasny sposób.

Poniżej znajdziesz: (1) dokładne kroki do anulowania subskrypcji w mniej niż minutę, (2) podsumowanie miejsc, w których cykliczna cena jest pokazywana podczas rejestracji, oraz (3) naszą politykę zwrotów.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) JAK ANULOWAĆ — 30 SEKUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Zaloguj się na swoje konto:
   https://editorpdf.net/pl/login

2. Przejdź do Panelu → zakładka "Płatności":
   https://editorpdf.net/pl/dashboard?tab=billing

3. Kliknij przycisk "Anuluj subskrypcję".

4. Potwierdź. Dostęp pozostaje aktywny do końca już opłaconego okresu, a żadne dodatkowe opłaty nie będą pobierane.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) GDZIE POKAZYWANA JEST CENA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Staramy się być w pełni transparentni co do cyklicznego charakteru. Oto miejsca, w których pojawia się cena miesięczna:

→ Strona z cenami:
  https://editorpdf.net/pl/pricing
  Cena miesięczna jest wyraźnie widoczna na karcie planu.

→ Paywall (tuż przed płatnością):
  Nad przyciskiem "Pobierz" widnieje wyraźnie widoczne powiadomienie informujące, że jeśli nie anulujesz przed końcem okresu próbnego, cena miesięczna będzie pobierana automatycznie do momentu anulowania.

→ Regulamin, sekcja 4 ("Model subskrypcji i ceny"):
  https://editorpdf.net/pl/terms

→ Stripe — weryfikacja 3D-Secure:
  Po zakończeniu płatności bank poprosił o potwierdzenie transakcji przez SMS lub aplikację bankową. To dodatkowe drugie potwierdzenie.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLITYKA ZWROTÓW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pełna polityka:
https://editorpdf.net/pl/refund

Jeśli faktycznie nie zdawałeś/aś sobie sprawy z cyklicznego charakteru usługi, po prostu odpowiedz na tę wiadomość, a postaramy się znaleźć rozwiązanie odpowiednie dla Ciebie.

Pozdrawiamy serdecznie,
Zespół EditorPDF`,
  },

  // ─────────────────────────────── RU ───────────────────────────────
  {
    name: "RU — Отмена и разъяснение (полное)",
    body: `Здравствуйте, {{name}}!

Спасибо, что написали — мы рады помочь и полностью понимаем ваше беспокойство. Сейчас всё чётко объясним.

Ниже вы найдёте: (1) точные шаги для отмены подписки менее чем за минуту, (2) сводку мест, где при регистрации показывается регулярная цена, и (3) нашу политику возврата средств.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) КАК ОТМЕНИТЬ — 30 СЕКУНД
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Войдите в свой аккаунт:
   https://editorpdf.net/ru/login

2. Перейдите в Личный кабинет → вкладка "Оплата":
   https://editorpdf.net/ru/dashboard?tab=billing

3. Нажмите кнопку "Отменить подписку".

4. Подтвердите. Доступ останется активным до конца уже оплаченного периода, и больше никаких списаний не будет.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) ГДЕ ПОКАЗЫВАЕТСЯ ЦЕНА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Мы стараемся быть максимально прозрачными в отношении регулярных платежей. Вот места, где указывается ежемесячная цена:

→ Страница тарифов:
  https://editorpdf.net/ru/pricing
  Ежемесячная плата выводится крупно на карточке плана.

→ Окно оплаты (прямо перед оплатой):
  Над кнопкой "Скачать" размещено хорошо заметное уведомление о том, что если вы не отмените подписку до окончания пробного периода, ежемесячная плата будет автоматически списываться до отмены.

→ Условия и положения, раздел 4 ("Модель подписки и цены"):
  https://editorpdf.net/ru/terms

→ Stripe — проверка 3D-Secure:
  При завершении платежа банк запросил подтверждение операции через SMS или банковское приложение. Это второе дополнительное подтверждение.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) ПОЛИТИКА ВОЗВРАТА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Полная политика:
https://editorpdf.net/ru/refund

Если вы действительно не знали о регулярном характере услуги, просто ответьте на это письмо, и мы постараемся найти подходящее решение.

С уважением,
Команда EditorPDF`,
  },

  // ─────────────────────────────── UK ───────────────────────────────
  {
    name: "UK — Скасування та пояснення (повне)",
    body: `Вітаємо, {{name}}!

Дякуємо, що написали — ми тут, щоб допомогти, і повністю розуміємо вашу стурбованість. Зараз чітко все пояснимо.

Нижче ви знайдете: (1) точні кроки для скасування підписки менш ніж за хвилину, (2) перелік місць, де при реєстрації відображається регулярна ціна, та (3) нашу політику повернення коштів.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) ЯК СКАСУВАТИ — 30 СЕКУНД
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Увійдіть до свого облікового запису:
   https://editorpdf.net/uk/login

2. Перейдіть до Кабінету → вкладка "Оплата":
   https://editorpdf.net/uk/dashboard?tab=billing

3. Натисніть кнопку "Скасувати підписку".

4. Підтвердіть. Доступ залишиться активним до кінця вже сплаченого періоду, і жодних додаткових списань більше не буде.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) ДЕ ПОКАЗУЄТЬСЯ ЦІНА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ми намагаємося бути максимально прозорими щодо регулярних платежів. Ось місця, де вказана щомісячна ціна:

→ Сторінка тарифів:
  https://editorpdf.net/uk/pricing
  Щомісячна плата виводиться помітно на картці плану.

→ Вікно оплати (безпосередньо перед платежем):
  Над кнопкою "Завантажити" розміщено добре видиме повідомлення про те, що якщо ви не скасуєте підписку до завершення пробного періоду, щомісячна плата автоматично списуватиметься до скасування.

→ Умови та положення, розділ 4 ("Модель підписки та ціни"):
  https://editorpdf.net/uk/terms

→ Stripe — перевірка 3D-Secure:
  Під час завершення платежу банк попросив підтвердити операцію через SMS або банківський застосунок. Це додаткове друге підтвердження.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) ПОЛІТИКА ПОВЕРНЕННЯ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Повна політика:
https://editorpdf.net/uk/refund

Якщо ви дійсно не знали про регулярний характер послуги, просто дайте відповідь на цей лист, і ми постараємося знайти рішення, яке вам підходить.

З повагою,
Команда EditorPDF`,
  },

  // ─────────────────────────────── RO ───────────────────────────────
  {
    name: "RO — Anulare și clarificare (complet)",
    body: `Bună ziua, {{name}},

mulțumim că ne-ați scris — suntem aici să ajutăm și înțelegem perfect îngrijorarea dvs. Vă explicăm totul clar.

Mai jos găsiți: (1) pașii exacți pentru anularea abonamentului în mai puțin de un minut, (2) un rezumat al locurilor în care prețul recurent este afișat la înscriere și (3) politica noastră de rambursare.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) CUM SĂ ANULAȚI — 30 DE SECUNDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Conectați-vă la contul dvs.:
   https://editorpdf.net/ro/login

2. Mergeți în Panou → fila „Facturare":
   https://editorpdf.net/ro/dashboard?tab=billing

3. Apăsați butonul „Anulează abonamentul".

4. Confirmați. Accesul rămâne activ până la sfârșitul perioadei deja facturate, iar nicio altă plată nu va mai fi efectuată.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) UNDE ESTE AFIȘAT PREȚUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ne străduim să fim total transparenți privind caracterul recurent. Iată locurile în care apare prețul lunar:

→ Pagina de prețuri:
  https://editorpdf.net/ro/pricing
  Tariful lunar este afișat proeminent pe cardul planului.

→ Paywall (chiar înainte de plată):
  Deasupra butonului „Descarcă" există o notă clar vizibilă care precizează că, dacă nu anulați înainte de finalul perioadei de probă, tariful lunar este facturat automat până la anulare.

→ Termeni și Condiții, Secțiunea 4 („Modelul de abonament și prețuri"):
  https://editorpdf.net/ro/terms

→ Stripe — verificare 3D-Secure:
  La finalizarea plății, banca dvs. a cerut validarea tranzacției prin SMS sau aplicație bancară. Aceasta este a doua confirmare suplimentară.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) POLITICA DE RAMBURSARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Politica completă:
https://editorpdf.net/ro/refund

Dacă într-adevăr nu ați fost conștient de caracterul recurent al serviciului, răspundeți la acest e-mail și vom face tot posibilul să găsim o soluție potrivită.

Cu stimă,
Echipa EditorPDF`,
  },

  // ─────────────────────────────── ZH ───────────────────────────────
  {
    name: "ZH — 取消订阅与说明（完整）",
    body: `您好 {{name}}，

感谢您与我们联系——我们随时为您提供帮助，完全理解您的担忧。下面将清楚地为您说明所有情况。

以下内容包含：(1) 在不到一分钟内取消订阅的具体步骤，(2) 注册时显示循环价格的位置汇总，以及 (3) 我们的退款政策。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) 如何取消 — 30 秒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 登录您的账户：
   https://editorpdf.net/zh/login

2. 进入"控制台"→"账单"标签：
   https://editorpdf.net/zh/dashboard?tab=billing

3. 点击"取消订阅"按钮。

4. 确认操作。您的访问权限将保留到当前已计费周期结束，之后不会再产生任何费用。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) 价格在哪里展示
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

我们致力于在循环订阅方面保持完全透明。以下是显示月度价格的位置：

→ 定价页面：
  https://editorpdf.net/zh/pricing
  月费在套餐卡片上以醒目方式展示。

→ 付款墙（付款前）：
  "下载"按钮上方有清晰可见的提示，说明如果您不在试用结束前取消，月费将自动扣款，直到您取消为止。

→ 服务条款第 4 节（"订阅模式与价格"）：
  https://editorpdf.net/zh/terms

→ Stripe — 3D-Secure 验证：
  完成付款时，您的银行通过短信或银行 App 要求您验证交易。这是第二次额外确认。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) 退款政策
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

完整政策：
https://editorpdf.net/zh/refund

如果您确实不知道服务的循环性质，只需回复此邮件，我们会尽力为您找到合适的解决方案。

此致敬礼，
EditorPDF 团队`,
  },
];

const db = await mysql.createConnection(process.env.DATABASE_URL);

let created = 0, skipped = 0;
for (const tpl of TEMPLATES) {
  const [rows] = await db.query("SELECT id FROM email_templates WHERE name = ? LIMIT 1", [tpl.name]);
  if (rows.length > 0) {
    console.log(`• skip "${tpl.name}" (already exists)`);
    skipped++;
    continue;
  }
  await db.query("INSERT INTO email_templates (name, body) VALUES (?, ?)", [tpl.name, tpl.body]);
  console.log(`✓ "${tpl.name}"`);
  created++;
}

console.log(`\nDone — ${created} created, ${skipped} skipped.`);
await db.end();

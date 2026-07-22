/**
 * Seed anti-chargeback canned replies. Run once to populate the
 * admin Mensajes tab with multilingual templates that point to:
 *  - the pricing page
 *  - the legal terms with the explicit recurring-charge clause
 *  - the paywall flow that requires double confirmation
 *
 * Usage: railway run node scripts/seed-email-templates.mjs
 *
 * Idempotent: if a template with the same name exists, it's skipped.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const TEMPLATES = [
  {
    name: "ES — Cargo legítimo (anti-chargeback)",
    body: `Hola {{name}},

Gracias por escribir. Sentimos las molestias.

Te confirmamos que el cargo que has visto en tu cuenta es completamente legítimo y corresponde a la suscripción que activaste en EditorPDF. Para que puedas ver el flujo exacto que aceptaste:

1) Página de precios con el plan mensual de {{price}}:
https://editorpdf.net/es/pricing

2) En el momento de descargar el PDF editado, el "paywall" indica de forma clara y obligatoria, JUSTO ENCIMA del botón de pago, el texto siguiente:
"Al pulsar 'Descargar', aceptas que, si no cancelas antes de que concluya la prueba de 48 horas (0,50€), se facturarán {{price}}/mes de forma automática hasta que canceles."

3) Esto está además recogido en nuestros Términos y Condiciones (apartado 4 — "Modelo de suscripción y precios"):
https://editorpdf.net/es/terms

4) El proceso requiere DOBLE confirmación: rellenar la tarjeta y validar 3D-Secure (un SMS o app de tu banco). Sin esos dos pasos no se efectúa ningún cobro.

5) Política de reembolso:
https://editorpdf.net/es/refund

Si lo que necesitas es CANCELAR la suscripción para evitar futuros cargos, puedes hacerlo ahora mismo desde tu panel:
https://editorpdf.net/es/dashboard?tab=billing

Quedamos atentos por si necesitas cualquier aclaración adicional.

Un saludo,
Equipo EditorPDF`,
  },
  {
    name: "EN — Legitimate charge (anti-chargeback)",
    body: `Hi {{name}},

Thanks for reaching out. Sorry for the confusion.

The charge you noticed on your card is entirely legitimate and corresponds to the EditorPDF subscription you activated. So you can review the exact flow you accepted:

1) Pricing page with the monthly plan at {{price}}:
https://editorpdf.net/en/pricing

2) Right above the "Download" button on the paywall, the following message is shown clearly and unavoidably:
"By pressing 'Download', you acknowledge that if the 48-hour trial (€0.50) is not cancelled beforehand, a recurring charge of {{price}}/month will apply until you cancel."

3) This is also covered in our Terms & Conditions (section 4 — "Subscription model and pricing"):
https://editorpdf.net/en/terms

4) The process requires DOUBLE confirmation: entering your card details AND completing 3D-Secure (an SMS or your banking app). No charge can happen without both steps.

5) Refund policy:
https://editorpdf.net/en/refund

If you wish to CANCEL the subscription to prevent future charges, you can do so right now from your account:
https://editorpdf.net/en/dashboard?tab=billing

Let us know if you need anything else.

Best regards,
EditorPDF Team`,
  },
  {
    name: "FR — Prélèvement légitime (anti-chargeback)",
    body: `Bonjour {{name}},

Merci de nous avoir contactés. Nous comprenons votre inquiétude.

Le prélèvement constaté sur votre compte est parfaitement légitime et correspond à l'abonnement EditorPDF que vous avez activé. Voici le flux exact que vous avez accepté :

1) Page de tarifs avec le plan mensuel à {{price}} :
https://editorpdf.net/fr/pricing

2) Juste au-dessus du bouton de paiement sur le paywall, le message suivant apparaît de manière claire et obligatoire :
"En cliquant sur 'Télécharger', vous acceptez que si vous n'annulez pas avant la fin de l'essai de 48 heures (0,50€), vous serez automatiquement facturé {{price}}/mois jusqu'à l'annulation."

3) Cela figure également dans nos Conditions Générales (section 4 — "Modèle d'abonnement et tarifs") :
https://editorpdf.net/fr/terms

4) Le processus exige une DOUBLE confirmation : saisie de la carte ET validation 3D-Secure (SMS ou application bancaire). Aucun prélèvement n'est possible sans ces deux étapes.

5) Politique de remboursement :
https://editorpdf.net/fr/refund

Si vous souhaitez ANNULER l'abonnement afin d'éviter tout prélèvement futur, vous pouvez le faire dès maintenant depuis votre espace :
https://editorpdf.net/fr/dashboard?tab=billing

N'hésitez pas à revenir vers nous pour toute clarification.

Cordialement,
L'équipe EditorPDF`,
  },
  {
    name: "ES — Cancelación + reembolso parcial",
    body: `Hola {{name}},

Gracias por escribirnos.

Entendemos tu situación. Como gesto de buena voluntad, vamos a:
1) Cancelar inmediatamente tu suscripción para que no recibas más cargos.
2) Procesar el reembolso del último cargo de {{price}} a la misma tarjeta. Tardará entre 5 y 10 días laborables en aparecer.

El cargo inicial de 0,50€ del periodo de prueba no es reembolsable, conforme a nuestras Condiciones (https://editorpdf.net/es/refund).

Confirmaremos por email cuando el reembolso esté procesado. No es necesario que hagas nada más.

Lamentamos las molestias y gracias por habernos dado la oportunidad de explicarte el funcionamiento del servicio.

Un saludo,
Equipo EditorPDF`,
  },
  {
    name: "ES — Aviso pre-chargeback (último intento)",
    body: `Hola {{name}},

Hemos visto que has iniciado un proceso de chargeback con tu banco por el cargo de {{price}}.

Antes de que tu banco resuelva, queremos darte una opción más rápida: **podemos reembolsarte directamente nosotros, hoy mismo**, sin necesidad de chargeback.

Si nos respondes a este email diciendo "acepto reembolso directo", procederemos en el momento. El reembolso aparece en tu tarjeta en 5-10 días laborables (mismo plazo que un chargeback, sin riesgo de penalización a tu cuenta).

Sin embargo, queremos también compartirte la documentación que enviaremos al banco si el chargeback sigue su curso, ya que el cargo es legítimo:

• Página de precios visible: https://editorpdf.net/es/pricing
• Términos aceptados con el cargo: https://editorpdf.net/es/terms (apartado 4)
• Texto del paywall que aceptaste antes de pagar: "Al pulsar 'Descargar', aceptas que se facturarán {{price}}/mes…"
• Validación 3D-Secure de tu banco al pagar (doble confirmación)
• Logs del navegador con timestamp de aceptación

Esta documentación demuestra el consentimiento explícito y suele resolver los chargebacks en favor del comerciante.

Tu opción más sencilla es responder a este email aceptando el reembolso directo. Lo procesamos hoy.

Un saludo,
Equipo EditorPDF`,
  },
  {
    name: "ES — No sabía que iba a pagar",
    body: `Hola {{name}},

Gracias por escribir y lamentamos la confusión.

Entendemos tu sorpresa, pero el cargo corresponde a la suscripción que activaste en EditorPDF. La renovación se te mostró —y aceptaste— de forma clara en varios momentos:

1) AL DESCARGAR tu documento, justo encima del botón, tenías que aceptar este aviso para continuar:
"Al pulsar 'Descargar', aceptas que, si no cancelas antes de que concluya la prueba de 48 horas (0,50€), se facturarán {{price}}/mes de forma automática hasta que canceles."
Además marcaste la casilla de aceptación de los Términos y Condiciones y la Política de Privacidad.

2) EN TU EMAIL DE BIENVENIDA, al pie, te lo recordamos por escrito:
"Has activado un período de prueba de 48 horas por 0,50€. Si no cancelas antes de la fecha indicada, tu suscripción se renovará automáticamente al plan mensual de {{price}}/mes. Puedes cancelar en cualquier momento desde tu panel de Facturación."

3) EN NUESTRA FAQ (página de precios), en "¿Qué pasa después de la prueba de 48 horas?":
"Tras la prueba, tu plan se renueva automáticamente al plan mensual. Puedes cancelar en cualquier momento antes de que termine la prueba."
https://editorpdf.net/es/pricing

Dicho esto, cancelar es muy sencillo y así no se te hará ningún cargo más:
1. Entra en https://editorpdf.net/es/dashboard?tab=billing
2. Pulsa "Cancelar suscripción".
Mantendrás el acceso hasta el final del periodo que ya tienes pagado.

Si necesitas que te ayudemos a cancelar o revisar tu caso, respóndenos y lo vemos encantados.

Un saludo,
Equipo EditorPDF`,
  },
  {
    name: "EN — Didn't know I'd be charged",
    body: `Hi {{name}},

Thanks for reaching out, and sorry for the confusion.

We understand your surprise, but the charge corresponds to the EditorPDF subscription you activated. The renewal was shown to you — and accepted — clearly, at several points:

1) WHEN DOWNLOADING your document, right above the button, you had to accept this notice to continue:
"By pressing 'Download', you acknowledge that if the 48-hour trial (€0.50) is not cancelled beforehand, a recurring charge of {{price}}/month will apply until you cancel."
You also ticked the box accepting our Terms & Conditions and Privacy Policy.

2) IN YOUR WELCOME EMAIL, at the bottom, we reminded you in writing:
"You've activated a 48-hour trial for €0.50. If you don't cancel before the date shown, your subscription will automatically renew at the monthly plan of {{price}}/month. You can cancel anytime from your Billing dashboard."

3) IN OUR FAQ (pricing page), under "What happens after the 48-hour trial?":
"After the trial, your plan automatically renews to the monthly plan. You can cancel anytime before the trial ends."
https://editorpdf.net/en/pricing

That said, cancelling is very easy, so you won't be charged again:
1. Go to https://editorpdf.net/en/dashboard?tab=billing
2. Click "Cancel subscription".
You'll keep access until the end of the period you've already paid for.

If you'd like us to help you cancel or review your case, just reply and we'll be glad to help.

Best regards,
EditorPDF Team`,
  },
  {
    name: "FR — Je ne savais pas que je serais facturé",
    body: `Bonjour {{name}},

Merci de nous avoir contactés, et désolés pour la confusion.

Nous comprenons votre surprise, mais le prélèvement correspond à l'abonnement EditorPDF que vous avez activé. Le renouvellement vous a été présenté — et accepté — clairement, à plusieurs reprises :

1) AU MOMENT DE TÉLÉCHARGER votre document, juste au-dessus du bouton, vous deviez accepter cet avis pour continuer :
"En cliquant sur 'Télécharger', vous acceptez que si vous n'annulez pas avant la fin de l'essai de 48 heures (0,50€), vous serez automatiquement facturé {{price}}/mois jusqu'à l'annulation."
Vous avez également coché la case d'acceptation des Conditions Générales et de la Politique de confidentialité.

2) DANS VOTRE E-MAIL DE BIENVENUE, en bas, nous vous l'avons rappelé par écrit :
"Vous avez activé une période d'essai de 48 heures pour 0,50€. Si vous n'annulez pas avant la date indiquée, votre abonnement sera automatiquement renouvelé au tarif mensuel de {{price}}/mois. Vous pouvez annuler à tout moment depuis votre tableau de Facturation."

3) DANS NOTRE FAQ (page de tarifs), à "Que se passe-t-il après l'essai de 48 heures ?" :
"Après l'essai, votre plan est automatiquement renouvelé au plan mensuel. Vous pouvez annuler à tout moment avant la fin de l'essai."
https://editorpdf.net/fr/pricing

Cela dit, l'annulation est très simple, ainsi vous ne serez plus prélevé :
1. Rendez-vous sur https://editorpdf.net/fr/dashboard?tab=billing
2. Cliquez sur "Annuler l'abonnement".
Vous conserverez l'accès jusqu'à la fin de la période déjà payée.

Si vous souhaitez que nous vous aidions à annuler ou à examiner votre cas, répondez-nous et nous serons ravis de vous aider.

Cordialement,
L'équipe EditorPDF`,
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

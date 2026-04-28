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

1) Página de precios con el plan mensual de 39,90€:
https://editorpdf.net/es/pricing

2) En el momento de descargar el PDF editado, el "paywall" indica de forma clara y obligatoria, JUSTO ENCIMA del botón de pago, el texto siguiente:
"Al pulsar 'Descargar', aceptas que, si no cancelas antes de que concluya la prueba de 48 horas (0,50€), se facturarán 39,90€/mes de forma automática hasta que canceles."

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

1) Pricing page with the monthly plan at €39.90:
https://editorpdf.net/en/pricing

2) Right above the "Download" button on the paywall, the following message is shown clearly and unavoidably:
"By pressing 'Download', you acknowledge that if the 48-hour trial (€0.50) is not cancelled beforehand, a recurring charge of €39.90/month will apply until you cancel."

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

1) Page de tarifs avec le plan mensuel à 39,90€ :
https://editorpdf.net/fr/pricing

2) Juste au-dessus du bouton de paiement sur le paywall, le message suivant apparaît de manière claire et obligatoire :
"En cliquant sur 'Télécharger', vous acceptez que si vous n'annulez pas avant la fin de l'essai de 48 heures (0,50€), vous serez automatiquement facturé 39,90€/mois jusqu'à l'annulation."

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
2) Procesar el reembolso del último cargo de 39,90€ a la misma tarjeta. Tardará entre 5 y 10 días laborables en aparecer.

El cargo inicial de 0,50€ del periodo de prueba no es reembolsable, conforme a nuestras Condiciones (https://editorpdf.net/es/refund).

Confirmaremos por email cuando el reembolso esté procesado en Stripe. No es necesario que hagas nada más.

Lamentamos las molestias y gracias por habernos dado la oportunidad de explicarte el funcionamiento del servicio.

Un saludo,
Equipo EditorPDF`,
  },
  {
    name: "ES — Aviso pre-chargeback (último intento)",
    body: `Hola {{name}},

Hemos visto que has iniciado un proceso de chargeback con tu banco por el cargo de 39,90€.

Antes de que tu banco resuelva, queremos darte una opción más rápida: **podemos reembolsarte directamente nosotros, hoy mismo**, sin necesidad de chargeback.

Si nos respondes a este email diciendo "acepto reembolso directo", procederemos en el momento. El reembolso aparece en tu tarjeta en 5-10 días laborables (mismo plazo que un chargeback, sin riesgo de penalización a tu cuenta).

Sin embargo, queremos también compartirte la documentación que enviaremos al banco si el chargeback sigue su curso, ya que el cargo es legítimo:

• Página de precios visible: https://editorpdf.net/es/pricing
• Términos aceptados con el cargo: https://editorpdf.net/es/terms (apartado 4)
• Texto del paywall que aceptaste antes de pagar: "Al pulsar 'Descargar', aceptas que se facturarán 39,90€/mes…"
• Validación 3D-Secure de tu banco al pagar (doble confirmación)
• Logs del navegador con timestamp de aceptación

Esta documentación demuestra el consentimiento explícito y suele resolver los chargebacks en favor del comerciante.

Tu opción más sencilla es responder a este email aceptando el reembolso directo. Lo procesamos hoy.

Un saludo,
Equipo EditorPDF`,
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

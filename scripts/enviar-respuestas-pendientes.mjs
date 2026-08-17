// Envía las 9 respuestas pendientes redactadas en
// docs/respuestas-pendientes-2026-08-18.md, cada una en el idioma en que escribió
// la persona, y marca el mensaje como respondido (con lo que el panel queda a
// cero sin tocar nada a mano).
//
// NO reembolsa nada: los reembolsos se dan con el botón del panel. Los textos
// dicen que el reembolso "está en curso", así que hay que darle a Reembolsar
// ANTES o justo después de enviar.
//
// Simula por defecto e imprime lo que enviaría. Para enviar de verdad: --enviar
//   railway run node scripts/enviar-respuestas-pendientes.mjs
//   railway run node scripts/enviar-respuestas-pendientes.mjs --enviar
import { openDb, tzCols, tzShow } from "./_db.mjs";

const ENVIAR = process.argv.includes("--enviar");

// Clave = id del mensaje en contact_messages. Un mismo texto puede cubrir dos
// mensajes de la misma persona (Eugenii escribió dos veces): se manda UN correo
// y se marcan los dos.
const RESPUESTAS = [
  {
    ids: [173], email: "christian.nmn@googlemail.com",
    asunto: "Ihre Word-Datei und Ihr Abo — erledigt",
    cuerpo: `Hallo Christian,

entschuldigen Sie bitte: die Umwandlung Ihrer PDF-Datei in Word hat auf unserer Seite nicht funktioniert, und Sie haben die Datei nie erhalten.

Was wir gerade erledigt haben:

• Ihr Testzugang ist gekündigt. Die Abbuchung von 29,95 €, die heute um 15:37 fällig gewesen wäre, findet NICHT statt.
• Die 0,50 € vom 17. August werden vollständig zurückerstattet (3-5 Werktage, je nach Bank).

Wenn Sie die Word-Datei noch brauchen, antworten Sie einfach auf diese E-Mail und hängen Sie das PDF an — wir wandeln es von Hand um und schicken es Ihnen zurück, ohne Kosten.

Viele Grüße
Support EditorPDF · support@editorpdf.net`,
  },
  {
    ids: [167], email: "daud154151@gmail.com",
    asunto: "Your €29.95 refund and cancellation — done",
    cuerpo: `Hello Dawood,

You are right that the €0.50 you paid on 6 August was only the start of a subscription, and we understand that was not what you expected.

Done just now:

• Your subscription is cancelled. There will be no charge on 12 September or after.
• The €29.95 charged on 13 August is being refunded in full (3-5 working days, depending on your bank).

You keep the documents already in your account. Nothing else will be charged.

Sorry for the trouble,
EditorPDF Support · support@editorpdf.net`,
  },
  {
    ids: [171], email: "sejgasbogdan215@gmail.com",
    asunto: "Your €29.95 refund — done",
    cuerpo: `Hello Bohdan,

Here is exactly what happened on your account: on 9 August you paid €0.50, which started a subscription, and on 16 August it renewed at €29.95.

Done just now:

• Your subscription is cancelled — nothing further will be charged.
• The €29.95 is being refunded in full (3-5 working days, depending on your bank).

Sorry it was not clearer at the time.
EditorPDF Support · support@editorpdf.net`,
  },
  {
    ids: [169], email: "muresianvasile@gmail.com",
    asunto: "Your full refund — done",
    cuerpo: `Hello Vasile,

You used the service once, on 8 August, and the €0.50 you paid then started a subscription that renewed at €29.95 on 15 August.

Done just now:

• Your subscription is cancelled.
• The €29.95 is being refunded in full (3-5 working days, depending on your bank).

Sorry for the confusion,
EditorPDF Support · support@editorpdf.net`,
  },
  {
    ids: [172, 170], email: "eugenioskr@gmail.com",
    asunto: "Your €29.95 refund — done",
    cuerpo: `Hello Yevhenii,

Thank you for writing, and sorry for the surprise. You used the editor on 8 August; the €0.50 you paid then started a subscription, which renewed at €29.95 on 15 August.

Done just now:

• Your subscription is cancelled — you already did this yourself, and it is confirmed on our side.
• The €29.95 is being refunded in full (3-5 working days, depending on your bank).

EditorPDF Support · support@editorpdf.net`,
  },
  {
    ids: [168], email: "barsaserhiy228@gmail.com",
    asunto: "Your €29.95 refund — done",
    cuerpo: `Hello Serhii,

Thank you for explaining. Done just now:

• Your subscription is cancelled — nothing further will be charged.
• The €29.95 charged on 14 August is being refunded in full (3-5 working days, depending on your bank).

Nothing else is needed from you.

EditorPDF Support · support@editorpdf.net`,
  },
  {
    ids: [165], email: "sainterose.simeon97215@gmail.com",
    asunto: "Votre remboursement — c'est fait",
    cuerpo: `Bonjour,

Oui, c'est possible, et c'est déjà lancé.

• Votre abonnement est résilié : plus aucun prélèvement.
• Le remboursement intégral de 29,95 € est en cours (3 à 5 jours ouvrés selon votre banque).

Merci de votre patience,
Support EditorPDF · support@editorpdf.net`,
  },
  {
    ids: [166], email: "olga0677995910@gmail.com",
    asunto: "Вашу підписку скасовано",
    cuerpo: `Добрий день, Ольго,

Підтверджуємо: вашу підписку скасовано ще 24 липня. Жодних списань більше не буде — спроби списати 29,95 € 25 і 28 липня не пройшли, тобто з вас нічого не стягнуто.

Якщо ви побачите будь-яке списання від нас, напишіть у відповідь на цей лист і ми повернемо кошти.

З повагою,
Підтримка EditorPDF · support@editorpdf.net`,
  },
];

const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}`);
console.log(ENVIAR ? "MODO REAL: se van a enviar correos\n" : "SIMULACIÓN (añade --enviar para mandarlos)\n");

let enviados = 0, marcados = 0;
for (const r of RESPUESTAS) {
  const [ms] = await db.query(
    `SELECT id, name, email, subject, message, repliedAt FROM contact_messages WHERE id IN (${r.ids.map(() => "?").join(",")})`,
    r.ids);
  if (!ms.length) { console.log(`✗ #${r.ids.join(",")} no encontrado`); continue; }
  const ya = ms.filter(m => m.repliedAt);
  if (ya.length === ms.length) { console.log(`• #${r.ids.join(",")} ya estaban respondidos, se salta`); continue; }
  const primero = ms[0];
  console.log(`→ #${r.ids.join("+")} a <${r.email}> «${r.asunto}»  (${r.cuerpo.length} caracteres)`);
  if (!ENVIAR) continue;

  const { sendContactReplyEmail } = await import("../server/email.ts");
  const ok = await sendContactReplyEmail({
    to: r.email,
    toName: primero.name ?? "",
    originalSubject: primero.subject ?? "",
    originalMessage: primero.message ?? "",
    replyBody: r.cuerpo,
  });
  if (!ok) { console.log(`   ✗ el correo NO salió — no se marca como respondido`); continue; }
  enviados++;
  const [upd] = await db.query(
    `UPDATE contact_messages SET repliedAt = UTC_TIMESTAMP(), replyBody = ?, \`read\` = 1
      WHERE id IN (${r.ids.map(() => "?").join(",")})`, [r.cuerpo, ...r.ids]);
  marcados += upd.affectedRows;
  console.log(`   ✓ enviado y marcado (${upd.affectedRows} mensaje(s))`);
}

if (ENVIAR) {
  const [[q]] = await db.query(
    "SELECT SUM(repliedAt IS NULL) sinResponder, SUM(`read`=0) sinLeer FROM contact_messages");
  console.log(`\nEnviados: ${enviados}   mensajes marcados: ${marcados}`);
  console.log(`El panel queda: ${q.sinResponder} sin responder · ${q.sinLeer} sin leer`);
} else {
  console.log(`\nNo se ha enviado nada. Repite con --enviar.`);
}
await db.end();
process.exit(0);

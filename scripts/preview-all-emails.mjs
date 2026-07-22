/**
 * Send ONE example of every customer-facing email to a recipient, so you can
 * review them all in real Gmail. Recovery emails are previewed separately
 * (scripts/preview-recovery-email.mjs).
 *
 * Usage: railway run npx tsx scripts/preview-all-emails.mjs <email> [lang]
 */
import dotenv from "dotenv";
dotenv.config();

const TO = process.argv[2];
const LANG = process.argv[3] ?? "es";
if (!TO) {
  console.error("Usage: node scripts/preview-all-emails.mjs <recipient> [lang]");
  process.exit(1);
}

const {
  sendTrialWelcomeEmail,
  sendCancellationEmail,
  sendPasswordResetEmail,
  sendContactReplyEmail,
} = await import("../server/email.ts");

const DAY = 24 * 60 * 60 * 1000;
const trialEnd = new Date(Date.now() + 2 * DAY);
const accessUntil = new Date(Date.now() + 27 * DAY);
const dash = "https://www.editorpdf.net/es/dashboard?tab=billing";
const pause = () => new Promise((r) => setTimeout(r, 900));

const steps = [
  ["1. Bienvenida (trial)", () => sendTrialWelcomeEmail({ to: TO, name: "Sergio", trialEndDate: trialEnd, lang: LANG })],
  ["2. Cancelación", () => sendCancellationEmail({ to: TO, name: "Sergio", accessUntilDate: accessUntil, reactivateUrl: "https://www.editorpdf.net/es/pricing" })],
  ["3. Reset de contraseña", () => sendPasswordResetEmail({ to: TO, name: "Sergio", resetUrl: "https://www.editorpdf.net/reset-password?token=ejemplo-demo-token" })],
  ["4. Respuesta de soporte", () => sendContactReplyEmail({ to: TO, toName: "Sergio", originalSubject: "No encuentro mi factura", originalMessage: "Hola, necesito la factura de mi último pago, ¿me la podéis enviar? Gracias.", replyBody: "¡Hola Sergio!\n\nClaro, aquí tienes tu factura adjunta. También puedes descargarla en cualquier momento desde tu panel → Facturación.\n\nUn saludo,\nEl equipo de EditorPDF" })],
];

for (const [label, fn] of steps) {
  try {
    const ok = await fn();
    console.log(ok === false ? `✗ ${label} — falló (ver logs)` : `✓ ${label} enviado`);
  } catch (e) {
    console.log(`✗ ${label} — error: ${e?.message ?? e}`);
  }
  await pause();
}

console.log("Listo. Revisa la bandeja (y Spam) de", TO);
process.exit(0);

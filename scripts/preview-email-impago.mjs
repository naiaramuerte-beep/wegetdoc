// Manda a UNA dirección el aviso de cobro fallido, para verlo antes de que le
// llegue a ningún cliente. No toca ninguna suscripción ni cobra nada.
//   railway run npx tsx scripts/preview-email-impago.mjs correo@ejemplo.com [idioma]
const destino = process.argv[2];
const idioma = process.argv[3] ?? "es";
if (!destino) {
  console.error("Uso: railway run npx tsx scripts/preview-email-impago.mjs <email> [idioma]");
  process.exit(1);
}
const { sendRenewalFailedEmail } = await import("../server/emailImpago.ts");
const ok = await sendRenewalFailedEmail({
  to: destino,
  lang: idioma,
  amountFormatted: new Intl.NumberFormat(idioma, { style: "currency", currency: "EUR" }).format(29.95),
  payUrl: "https://www.editorpdf.net/es/dashboard?tab=billing",
});
console.log(ok ? `✓ enviado a ${destino} (${idioma})` : "✗ no se pudo enviar");
process.exit(ok ? 0 : 1);

/**
 * Send a preview of ALL 3 recovery-email stages to a chosen recipient so you
 * can see the real Gmail rendering without waiting for the drip sequence.
 *
 * Usage: railway run npx tsx scripts/preview-recovery-email.mjs <email> [lang]
 *   lang defaults to "es". Try: en, fr, de, pt, it, nl, pl, ru, uk, ro, zh.
 */
import dotenv from "dotenv";
dotenv.config();

const TO = process.argv[2];
const LANG = process.argv[3] ?? "es";
if (!TO) {
  console.error("Usage: node scripts/preview-recovery-email.mjs <recipient> [lang]");
  process.exit(1);
}

const { sendRecoveryEmail } = await import("../server/email.ts");

const docName = "Contrato_alquiler.pdf";
const downloadUrl = "https://www.editorpdf.net/es/dashboard?tab=documents";
const unsubscribeUrl = "https://www.editorpdf.net/api/recovery/unsubscribe?u=0&s=preview";
const expiresDate = new Intl.DateTimeFormat(LANG === "zh" ? "zh-CN" : LANG, {
  day: "numeric", month: "long",
}).format(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));

for (const stage of [1, 2, 3]) {
  const ok = await sendRecoveryEmail({
    to: TO,
    lang: LANG,
    docName,
    downloadUrl,
    unsubscribeUrl,
    expiresDate,
    stage,
  });
  console.log(ok ? `✓ etapa ${stage} enviada a ${TO}` : `✗ etapa ${stage} falló — ver logs`);
  // Small gap so Resend doesn't rate-limit the burst.
  await new Promise((r) => setTimeout(r, 800));
}

console.log("Listo. Revisa la bandeja (y Spam) de", TO);
process.exit(0);

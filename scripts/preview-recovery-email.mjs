/**
 * Send a preview of ALL 3 recovery-email stages to a chosen recipient so you
 * can see the real Gmail rendering without waiting for the drip sequence.
 *
 * Usage: railway run npx tsx scripts/preview-recovery-email.mjs <email> [lang]
 *   lang defaults to "es". Try: en, fr, de, pt, it, nl, pl, ru, uk, ro, zh.
 */
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const TO = process.argv[2];
const LANG = process.argv[3] ?? "es";
if (!TO) {
  console.error("Usage: node scripts/preview-recovery-email.mjs <recipient> [lang]");
  process.exit(1);
}

const { sendRecoveryEmail } = await import("../server/email.ts");
const { getUserByEmail } = await import("../server/db.ts");

const docName = "Contrato_alquiler.pdf";

// Build a REAL signed auto-login link if the recipient has an account + the
// CRON_SECRET is available — so the demo button actually logs you in and lands
// on your documents (falls back to the plain dashboard otherwise).
let downloadUrl = `https://www.editorpdf.net/${LANG}/dashboard?tab=documents`;
try {
  const user = await getUserByEmail(TO);
  const secret = process.env.CRON_SECRET;
  if (user && secret) {
    const next = `/${LANG}/dashboard?tab=documents`;
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sig = crypto.createHmac("sha256", secret).update(`${user.id}.${exp}.${next}`).digest("hex").slice(0, 32);
    downloadUrl = `https://www.editorpdf.net/api/recovery/login?u=${user.id}&exp=${exp}&next=${encodeURIComponent(next)}&sig=${sig}`;
    console.log(`(enlace de auto-login real para userId=${user.id})`);
  } else {
    console.log("(sin cuenta/secreto → botón va al dashboard normal)");
  }
} catch (e) { console.log("(no se pudo firmar auto-login:", e?.message ?? e, ")"); }
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

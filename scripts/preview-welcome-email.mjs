/**
 * Send a preview of the trial-welcome email to a chosen recipient so
 * you can see the rendering in real Gmail without paying a trial.
 *
 * Usage: railway run node scripts/preview-welcome-email.mjs <email> [lang]
 *   lang defaults to "es". Try: en, fr, de, pt, it, nl, pl, ru, uk, ro, zh.
 */
import dotenv from "dotenv";
dotenv.config();

const TO = process.argv[2];
const LANG = process.argv[3] ?? "es";
if (!TO) {
  console.error("Usage: node scripts/preview-welcome-email.mjs <recipient> [lang]");
  process.exit(1);
}

// Dynamic import so this script runs straight from the compiled tsx env.
const { sendTrialWelcomeEmail } = await import("../server/email.ts");

const trialEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
const ok = await sendTrialWelcomeEmail({
  to: TO,
  name: "Sergio",
  trialEndDate: trialEnd,
  lang: LANG,
});

console.log(ok ? `✓ sent (lang=${LANG}) to ${TO}` : "✗ failed — see logs above");
